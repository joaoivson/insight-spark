import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  ExternalLink,
  Search,
  ArrowUpDown,
  MousePointerClick,
  X,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useState } from "react";
import type { DatasetRow } from "@/components/dashboard/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { useDatasetStore } from "@/stores/datasetStore";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { useClicksStore } from "@/stores/clicksStore";
import { toDateKey, parseDateOnly, isBeforeDateKey, isAfterDateKey, formatHourRange } from "@/shared/lib/date";
import { getComissaoAfiliado } from "@/shared/lib/kpi";
import { grossUpSpend, netCommission } from "@/shared/lib/tax";
import { useTaxSettingsStore } from "@/stores/taxSettingsStore";
import { normalizeSubId, cn } from "@/shared/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DataCard } from "@/components/shared/DataCard";
import * as XLSX from "xlsx";

// Pivot Definitions
type DimensionKey = "date" | "product" | "category" | "status" | "sub_id1" | "platform" | "time";
type MetricKey = "revenue" | "commission" | "associatedClicks" | "associatedCost" | "profit" | "quantity";

interface PivotConfig {
  dimensions: DimensionKey[];
  metrics: MetricKey[];
}

const DIMENSIONS: { key: DimensionKey; label: string }[] = [
  { key: "date", label: "Data" },
  { key: "product", label: "Produto" },
  { key: "category", label: "Categoria" },
  { key: "status", label: "Status" },
  { key: "sub_id1", label: "Sub ID" },
  { key: "platform", label: "Canal" },
];

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "quantity", label: "Quantidade" },
  { key: "revenue", label: "Faturamento" },
  { key: "commission", label: "Comissão" },
  { key: "associatedClicks", label: "Cliques" },
  { key: "associatedCost", label: "Custos de anúncios" },
  { key: "profit", label: "Lucro" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value || 0) + "%";

const ReportsPage = () => {
  const { rows, loading: rowsLoading, fetchRows } = useDatasetStore();
  const { adSpends, loading: spendsLoading, fetchAdSpends } = useAdSpendsStore();
  const { clicks, loading: clicksLoading, fetchClicks } = useClicksStore();
  const adTaxRate = useTaxSettingsStore((s) => s.adTaxRate);
  const commissionTaxRate = useTaxSettingsStore((s) => s.commissionTaxRate);
  const fetchTax = useTaxSettingsStore((s) => s.fetch);
  const tax = useMemo(() => ({ adTaxRate, commissionTaxRate }), [adTaxRate, commissionTaxRate]);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [subIdFilter, setSubIdFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("commission");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Pivot Config State
  const [pivotConfig, setPivotConfig] = useState<PivotConfig>(() => {
    const saved = localStorage.getItem("reports_pivot_config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse pivot config", e);
      }
    }
    return { dimensions: [], metrics: ["quantity", "revenue", "commission"] as MetricKey[] };
  });

  useEffect(() => {
    localStorage.setItem("reports_pivot_config", JSON.stringify(pivotConfig));
  }, [pivotConfig]);

  const toggleDimension = (key: DimensionKey) => {
    setPivotConfig(prev => ({
      ...prev,
      dimensions: prev.dimensions.includes(key)
        ? prev.dimensions.filter(d => d !== key)
        : [...prev.dimensions, key]
    }));
  };

  const toggleMetric = (key: MetricKey) => {
    setPivotConfig(prev => ({
      ...prev,
      metrics: prev.metrics.includes(key)
        ? prev.metrics.filter(m => m !== key)
        : [...prev.metrics, key]
    }));
  };

  useEffect(() => {
    fetchRows({ range: dateRange });
    fetchAdSpends({ range: dateRange });
    fetchClicks({ range: dateRange });
    fetchTax();
  }, []);

  const isLoading = rowsLoading || spendsLoading || clicksLoading;

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && (r.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (categoryFilter && (r.category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (subIdFilter && normalizeSubId(r.sub_id1).toLowerCase() !== subIdFilter.toLowerCase()) return false;
      if (searchTerm && !r.product.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      if (dateRange.from && isBeforeDateKey(r.date, dateRange.from)) return false;
      if (dateRange.to && isAfterDateKey(r.date, dateRange.to)) return false;
      return true;
    });
  }, [rows, statusFilter, categoryFilter, subIdFilter, dateRange, searchTerm]);

  // Join logic: Group clicks and ads by date and sub_id
  const joinedData = useMemo(() => {
    // 1. Map clicks: date_subid -> clicks
    const clicksMap = new Map<string, number>();
    clicks.forEach((c) => {
      const key = `${c.date}_${normalizeSubId(c.sub_id).toLowerCase()}`;
      clicksMap.set(key, (clicksMap.get(key) || 0) + (Number(c.clicks) || 0));
    });

    // 2. Map ad spends: date_subid -> amount
    const adsMap = new Map<string, number>();
    adSpends.forEach((s) => {
      const key = `${toDateKey(s.date)}_${normalizeSubId(s.sub_id || "Geral").toLowerCase()}`;
      adsMap.set(key, (adsMap.get(key) || 0) + (Number(s.amount) || 0));
    });

    // 3. Enrich filteredRows
    return filteredRows.map((row) => {
      const dateKey = row.date;
      const subIdKey = normalizeSubId(row.sub_id1).toLowerCase();
      const lookupKey = `${dateKey}_${subIdKey}`;

      const associatedClicks = clicksMap.get(lookupKey) || 0;
      // Imposto em tempo de cálculo: gasto com markup + comissão líquida
      const associatedCost = grossUpSpend(adsMap.get(lookupKey) || 0, tax);
      const comissao = netCommission(getComissaoAfiliado(row), tax);
      const profit = comissao - associatedCost;

      return {
        ...row,
        commission: comissao,
        associatedClicks,
        associatedCost,
        profit,
      };
    }).sort((a, b) => {
      const factor = sortDir === "asc" ? 1 : -1;
      const valA = (a as any)[sortBy];
      const valB = (b as any)[sortBy];
      if (typeof valA === "number" && typeof valB === "number") return (valA - valB) * factor;
      return String(valA || "").localeCompare(String(valB || "")) * factor;
    });
  }, [filteredRows, clicks, adSpends, sortBy, sortDir, tax]);

  const hasAssociatedData = useMemo(() => {
    const hasClicks = joinedData.some(r => (r.associatedClicks ?? 0) > 0);
    const hasCosts = joinedData.some(r => (r.associatedCost ?? 0) > 0);
    return { hasClicks, hasCosts, showProfit: hasClicks || hasCosts };
  }, [joinedData]);

  // Pivot Logic Hook
  const pivotData = useMemo(() => {
    const isPivotMode = pivotConfig.dimensions.length > 0;

    if (!isPivotMode) return joinedData;

    const groups = new Map<string, any>();

    joinedData.forEach(row => {
      const getDimValue = (dim: DimensionKey) => {
        if (dim === "time") {
          const timeVal = row.time ?? (row as any).horario ?? null;
          return formatHourRange(timeVal);
        }
        if (dim === "platform") return row.platform || "—";
        return row[dim] ?? "N/A";
      };
      const key = pivotConfig.dimensions.map(dim => String(getDimValue(dim))).join("_");
      const prev = groups.get(key) || {
        ...pivotConfig.dimensions.reduce((acc, dim) => ({ ...acc, [dim]: getDimValue(dim) }), {}),
        quantity: 0,
        revenue: 0,
        commission: 0,
        associatedClicks: 0,
        associatedCost: 0,
        profit: 0,
        salesCount: 0,
      };

      groups.set(key, {
        ...prev,
        quantity: prev.quantity + (Number(row.quantity) || 0),
        revenue: prev.revenue + (Number(row.revenue) || 0),
        commission: prev.commission + (Number(row.commission) || 0),
        associatedClicks: prev.associatedClicks + (Number(row.associatedClicks) || 0),
        associatedCost: prev.associatedCost + (Number(row.associatedCost) || 0),
        profit: prev.profit + (Number(row.profit) || 0),
        salesCount: prev.salesCount + 1,
      });
    });

    return Array.from(groups.values()).sort((a, b) => {
      const factor = sortDir === "asc" ? 1 : -1;
      const valA = (a as any)[sortBy];
      const valB = (b as any)[sortBy];
      if (typeof valA === "number" && typeof valB === "number") return (valA - valB) * factor;
      return String(valA || "").localeCompare(String(valB || "")) * factor;
    });
  }, [joinedData, pivotConfig, sortBy, sortDir]);

  const statusOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.status).filter(Boolean))).sort(), [rows]);
  const categoryOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort(), [rows]);
  const subIdOptions = useMemo(() => {
    const fromSales = rows.map((r) => normalizeSubId(r.sub_id1)).filter(s => s !== "Sem Sub ID");
    const fromClicks = clicks.map((c) => normalizeSubId(c.sub_id)).filter(s => s !== "Sem Sub ID");
    return Array.from(new Set([...fromSales, ...fromClicks])).sort();
  }, [rows, clicks]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  const getShopeeLink = (row: any) => {
    if (row.shop_id && row.item_id) {
      return `https://shopee.com.br/product/${row.shop_id}/${row.item_id}`;
    }
    return null;
  };

  const renderCell = (row: any, key: string) => {
    const val = row[key];

    if (key === "date") {
      return parseDateOnly(val)?.toLocaleDateString("pt-BR") || val;
    }

    if (key === "product") {
      const shopeeLink = getShopeeLink(row);
      return (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {val}
          </span>
          {shopeeLink && (
            <a
              href={shopeeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-accent flex items-center gap-1 hover:underline"
            >
              Ver na Shopee <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      );
    }

    if (key === "revenue" || key === "commission" || key === "associatedCost" || key === "profit") {
      return (
        <span className={cn(
          "font-mono",
          key === "profit" && val > 0 ? "text-success font-bold" : key === "profit" && val < 0 ? "text-destructive font-bold" : ""
        )}>
          {formatCurrency(val)}
        </span>
      );
    }

    if (key === "associatedClicks") {
      return val > 0 ? (
        <div className="flex items-center justify-end gap-1 text-accent font-mono">
          <MousePointerClick className="w-3 h-3" />
          {val.toLocaleString("pt-BR")}
        </div>
      ) : "-";
    }

    if (key === "quantity") {
      return <span className="font-mono">{val}</span>;
    }

    if (key === "status") {
      return (
        <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 py-0">
          {val}
        </Badge>
      );
    }

    if (key === "sub_id1") {
      return <span className="text-[10px] font-mono text-muted-foreground">{val}</span>;
    }

    if (key === "platform") {
      return <span className="text-sm text-muted-foreground">{val || "—"}</span>;
    }

    if (key === "time") {
      const timeVal = val ?? (row as any).horario ?? null;
      const display = typeof timeVal === "string" && /^Entre \d{2} e \d{2}:00$/.test(timeVal) ? timeVal : formatHourRange(timeVal);
      return <span className="text-xs text-muted-foreground">{display}</span>;
    }

    return val;
  };

  const handleExportExcel = () => {
    // Determine dynamic headers based on pivot config
    const headers: string[] = [];
    const keys: string[] = [];

    if (pivotConfig.dimensions.length > 0) {
      pivotConfig.dimensions.forEach(dimKey => {
        headers.push(DIMENSIONS.find(d => d.key === dimKey)?.label || "");
        keys.push(dimKey === "platform" ? "platform" : dimKey === "time" ? "time" : dimKey);
      });
      pivotConfig.metrics.forEach(metricKey => {
        headers.push(METRICS.find(m => m.key === metricKey)?.label || "");
        keys.push(metricKey);
      });
    } else {
      headers.push("Produto", "Quantidade", "Faturamento", "Comissão", "Canal", "Horário");
      keys.push("product", "quantity", "revenue", "commission", "platform", "time");
      if (hasAssociatedData.hasClicks) {
        headers.push("Cliques");
        keys.push("associatedClicks");
      }
      if (hasAssociatedData.hasCosts) {
        headers.push("Custos de anúncios");
        keys.push("associatedCost");
      }
      if (hasAssociatedData.showProfit) {
        headers.push("Lucro");
        keys.push("profit");
      }
    }

    // Prepare data rows
    const wsData = [
      headers,
      ...pivotData.map((row) => keys.map(key => {
        const val = (row as any)[key];
        if (key === "date") return parseDateOnly(val)?.toLocaleDateString("pt-BR") || val;
        if (key === "time") return formatHourRange(val);
        if (key === "platform") return val || "—";
        return val;
      })),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    const sheetName = pivotConfig.dimensions.length > 0 ? "Relatório Consolidado" : "Relatório Detalhado";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `relatorio_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <DashboardLayout
      title="Relatório Dinâmico"
      subtitle="Análise personalizada de vendas, cliques e anúncios"
      action={
        <Button onClick={handleExportExcel} className="gap-2 w-full sm:w-auto" variant="accent">
          <Download className="w-4 h-4" />
          Exportar Excel
        </Button>
      }
    >
      <div className="space-y-6">
        <DashboardFilters
          dateRange={dateRange}
          onDateRangeApply={(range) => {
            setDateRange(range);
            fetchRows({ range });
            fetchAdSpends({ range });
            fetchClicks({ range });
          }}
          onClear={() => {
            setStatusFilter("");
            setCategoryFilter("");
            setSubIdFilter("");
            setSearchTerm("");
            setDateRange({});
            // Sem período = histórico inteiro; a API é quem corta por data.
            fetchRows({});
            fetchAdSpends({});
            fetchClicks({});
          }}
          hasActive={!!dateRange.from || !!dateRange.to || !!statusFilter || !!categoryFilter || !!subIdFilter || !!searchTerm}
          loading={isLoading}
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          subIdFilter={subIdFilter}
          onStatusFilterChange={setStatusFilter}
          onCategoryFilterChange={setCategoryFilter}
          onSubIdFilterChange={setSubIdFilter}
          statusOptions={statusOptions}
          categoryOptions={categoryOptions}
          subIdOptions={subIdOptions}
          rows={rows}
          adSpends={adSpends}
          clicks={clicks}
        />

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex-1 bg-card border border-border rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all group">
            <div className="p-2 bg-secondary/50 rounded-lg group-focus-within:bg-primary/10 transition-colors flex-shrink-0">
              <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-none focus-visible:ring-0 bg-transparent h-9 p-0 text-sm placeholder:text-muted-foreground/60"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors flex-shrink-0"
                onClick={() => setSearchTerm("")}
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <Sheet open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full lg:w-auto h-12 gap-2.5 border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-semibold px-5 rounded-xl shadow-sm transition-colors">
                <Settings2 className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm uppercase tracking-wide">Criar Tabela Dinâmica</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Configuração da Tabela</SheetTitle>
                <SheetDescription>
                  Personalize como os dados são exibidos e agrupados.
                </SheetDescription>
              </SheetHeader>
              <div className="py-6 space-y-8">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Agrupar por (Linhas)
                  </h4>
                  <p className="text-xs text-muted-foreground">Selecione os campos para consolidar os dados. Se nenhum for selecionado, a tabela exibirá a lista detalhada venda a venda.</p>
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    {DIMENSIONS.map((dim) => (
                      <div key={dim.key} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => toggleDimension(dim.key)}>
                        <Checkbox
                          id={`dim-${dim.key}`}
                          checked={pivotConfig.dimensions.includes(dim.key)}
                          onCheckedChange={() => toggleDimension(dim.key)}
                        />
                        <Label htmlFor={`dim-${dim.key}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                          {dim.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Valores (Colunas)
                  </h4>
                  <p className="text-xs text-muted-foreground">Selecione as métricas que deseja visualizar.</p>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {METRICS.map((metric) => (
                      <div key={metric.key} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => toggleMetric(metric.key)}>
                        <Checkbox
                          id={`met-${metric.key}`}
                          checked={pivotConfig.metrics.includes(metric.key)}
                          onCheckedChange={() => toggleMetric(metric.key)}
                        />
                        <Label htmlFor={`met-${metric.key}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                          {metric.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {isLoading && !rows.length ? (
          <ReportsSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-4 md:p-6 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-secondary/5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-background rounded-lg border border-border flex-shrink-0">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-foreground truncate">
                      {pivotConfig.dimensions.length > 0 ? "Tabela Dinâmica Consolidada" : "Relatório Detalhado"}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {pivotConfig.dimensions.length > 0
                        ? `Agrupado por: ${pivotConfig.dimensions.map(d => DIMENSIONS.find(dim => dim.key === d)?.label).join(", ")}`
                        : "Vendas associadas a cliques e custos por Sub ID e Data"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                  {pivotConfig.dimensions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-primary gap-2"
                      onClick={() => setPivotConfig({ dimensions: [], metrics: ["quantity", "revenue", "commission"] as MetricKey[] })}
                    >
                      <X className="w-3 h-3" />
                      Limpar Tabela
                    </Button>
                  )}
                  <Badge variant="outline" className="font-mono">
                    {pivotData.length} registros
                  </Badge>
                </div>
              </div>

              {/* Desktop: tabela densa */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/20 hover:bg-secondary/20">
                      {/* Render Active Dimensions Headers */}
                      {pivotConfig.dimensions.length > 0 ? (
                        pivotConfig.dimensions.map(dimKey => {
                          const dim = DIMENSIONS.find(d => d.key === dimKey);
                          return (
                            <TableHead key={dimKey} onClick={() => handleSort(dimKey)} className="cursor-pointer">
                              <div className="flex items-center gap-1">{dim?.label} <ArrowUpDown className="w-3 h-3" /></div>
                            </TableHead>
                          );
                        })
                      ) : (
                        // Default Headers: Produto, Quantidade, Faturamento, Comissão, Canal, Horário + conditional
                        <>
                          <TableHead onClick={() => handleSort("product")} className="cursor-pointer min-w-[250px]">
                            <div className="flex items-center gap-1">Produto <ArrowUpDown className="w-3 h-3" /></div>
                          </TableHead>
                          <TableHead onClick={() => handleSort("quantity")} className="text-right cursor-pointer">
                            <div className="flex items-center justify-end gap-1">Quantidade <ArrowUpDown className="w-3 h-3" /></div>
                          </TableHead>
                          <TableHead onClick={() => handleSort("revenue")} className="text-right cursor-pointer">
                            <div className="flex items-center justify-end gap-1">Faturamento <ArrowUpDown className="w-3 h-3" /></div>
                          </TableHead>
                          <TableHead onClick={() => handleSort("commission")} className="text-right cursor-pointer">
                            <div className="flex items-center justify-end gap-1">Comissão <ArrowUpDown className="w-3 h-3" /></div>
                          </TableHead>
                          <TableHead onClick={() => handleSort("platform")} className="cursor-pointer">
                            <div className="flex items-center gap-1">Canal <ArrowUpDown className="w-3 h-3" /></div>
                          </TableHead>
                          <TableHead onClick={() => handleSort("time")} className="cursor-pointer">
                            <div className="flex items-center gap-1">Horário <ArrowUpDown className="w-3 h-3" /></div>
                          </TableHead>
                          {hasAssociatedData.hasClicks && (
                            <TableHead onClick={() => handleSort("associatedClicks")} className="text-right cursor-pointer">
                              <div className="flex items-center justify-end gap-1">Cliques <ArrowUpDown className="w-3 h-3" /></div>
                            </TableHead>
                          )}
                          {hasAssociatedData.hasCosts && (
                            <TableHead onClick={() => handleSort("associatedCost")} className="text-right cursor-pointer">
                              <div className="flex items-center justify-end gap-1">Custos de anúncios <ArrowUpDown className="w-3 h-3" /></div>
                            </TableHead>
                          )}
                          {hasAssociatedData.showProfit && (
                            <TableHead onClick={() => handleSort("profit")} className="text-right cursor-pointer">
                              <div className="flex items-center justify-end gap-1">Lucro <ArrowUpDown className="w-3 h-3" /></div>
                            </TableHead>
                          )}
                        </>
                      )}

                      {/* Render Active Metrics Headers (only in pivot mode) */}
                      {pivotConfig.dimensions.length > 0 && pivotConfig.metrics.map(metricKey => {
                        const metric = METRICS.find(m => m.key === metricKey);
                        return (
                          <TableHead key={metricKey} onClick={() => handleSort(metricKey)} className="text-right cursor-pointer">
                            <div className="flex items-center justify-end gap-1">{metric?.label} <ArrowUpDown className="w-3 h-3" /></div>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {pivotData.slice(0, 100).map((row, idx) => {
                        return (
                          <motion.tr
                            key={`${row.id || idx}-${idx}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            {/* Render Dimension Cells */}
                            {pivotConfig.dimensions.length > 0 ? (
                              pivotConfig.dimensions.map(dimKey => (
                                <TableCell key={dimKey} className={cn(dimKey === "date" ? "text-xs whitespace-nowrap" : "")}>
                                  {renderCell(row, dimKey)}
                                </TableCell>
                              ))
                            ) : (
                              // Default Cells: Produto, Quantidade, Faturamento, Comissão, Canal, Horário + conditional
                              <>
                                <TableCell className="max-w-[300px]">
                                  {renderCell(row, "product")}
                                </TableCell>
                                <TableCell className="text-right">
                                  {renderCell(row, "quantity")}
                                </TableCell>
                                <TableCell className="text-right">
                                  {renderCell(row, "revenue")}
                                </TableCell>
                                <TableCell className="text-right">
                                  {renderCell(row, "commission")}
                                </TableCell>
                                <TableCell>
                                  {renderCell(row, "platform")}
                                </TableCell>
                                <TableCell>
                                  {renderCell(row, "time")}
                                </TableCell>
                                {hasAssociatedData.hasClicks && (
                                  <TableCell className="text-right">
                                    {renderCell(row, "associatedClicks")}
                                  </TableCell>
                                )}
                                {hasAssociatedData.hasCosts && (
                                  <TableCell className="text-right">
                                    {renderCell(row, "associatedCost")}
                                  </TableCell>
                                )}
                                {hasAssociatedData.showProfit && (
                                  <TableCell className="text-right">
                                    {renderCell(row, "profit")}
                                  </TableCell>
                                )}
                              </>
                            )}

                            {/* Render Metric Cells (only in pivot mode) */}
                            {pivotConfig.dimensions.length > 0 && pivotConfig.metrics.map(metricKey => (
                              <TableCell key={metricKey} className="text-right">
                                {renderCell(row, metricKey)}
                              </TableCell>
                            ))}
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                    {!pivotData.length && (
                      <TableRow>
                        <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                          {isLoading ? "Carregando dados..." : "Nenhum dado encontrado para os filtros selecionados."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: lista de cards */}
              <div className="md:hidden">
                {!pivotData.length ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {isLoading ? "Carregando dados..." : "Nenhum dado encontrado para os filtros selecionados."}
                  </div>
                ) : (
                  <div className="space-y-3 p-4">
                    {pivotData.slice(0, 100).map((row, idx) => {
                      const isPivot = pivotConfig.dimensions.length > 0;

                      // Título do card: 1ª dimensão (pivot) ou produto (detalhe)
                      const titleKey = isPivot ? pivotConfig.dimensions[0] : "product";
                      const title = renderCell(row as any, titleKey);

                      // Dimensões restantes viram campos
                      const dimFields = isPivot
                        ? pivotConfig.dimensions.slice(1).map((dimKey) => ({
                            label: DIMENSIONS.find((d) => d.key === dimKey)?.label || dimKey,
                            value: renderCell(row as any, dimKey),
                          }))
                        : [];

                      // Métricas / colunas de valor
                      const metricFields = isPivot
                        ? pivotConfig.metrics.map((metricKey) => ({
                            label: METRICS.find((m) => m.key === metricKey)?.label || metricKey,
                            value: renderCell(row as any, metricKey),
                            emphasis: metricKey === "commission" || metricKey === "profit",
                          }))
                        : [
                            { label: "Quantidade", value: renderCell(row as any, "quantity") },
                            { label: "Faturamento", value: renderCell(row as any, "revenue") },
                            { label: "Comissão", value: renderCell(row as any, "commission"), emphasis: true },
                            { label: "Canal", value: renderCell(row as any, "platform") },
                            { label: "Horário", value: renderCell(row as any, "time") },
                            ...(hasAssociatedData.hasClicks
                              ? [{ label: "Cliques", value: renderCell(row as any, "associatedClicks") }]
                              : []),
                            ...(hasAssociatedData.hasCosts
                              ? [{ label: "Custos de anúncios", value: renderCell(row as any, "associatedCost") }]
                              : []),
                            ...(hasAssociatedData.showProfit
                              ? [{ label: "Lucro", value: renderCell(row as any, "profit"), emphasis: true }]
                              : []),
                          ];

                      return (
                        <DataCard
                          key={`m-${(row as any).id || idx}-${idx}`}
                          title={title}
                          fields={[...dimFields, ...metricFields]}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {pivotData.length > 100 && (
                <div className="p-4 text-center border-t border-border bg-secondary/5">
                  <p className="text-xs text-muted-foreground italic">
                    Exibindo apenas os primeiros 100 resultados de {pivotData.length}. Use os filtros acima para refinar sua busca ou exporte para Excel para ver tudo.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;

const ReportsSkeleton = () => {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-3">
            <Skeleton className="h-4 w-20 md:w-32" />
            <Skeleton className="h-7 md:h-8 w-24 md:w-40" />
          </div>
        ))}
      </div>
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <Skeleton className="h-5 w-40" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-14 md:h-10 w-full" />
        ))}
      </div>
    </div>
  );
};
