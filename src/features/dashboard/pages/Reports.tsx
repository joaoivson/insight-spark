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
  FilterX,
  X,
  Filter,
  Settings2,
  Check,
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
import { toDateKey, parseDateOnly, isBeforeDateKey, isAfterDateKey } from "@/shared/lib/date";
import { getComissaoAfiliado } from "@/shared/lib/kpi";
import { normalizeSubId, cn } from "@/shared/lib/utils";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

// Pivot Definitions
type DimensionKey = "date" | "product" | "category" | "status" | "sub_id1";
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

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [subIdFilter, setSubIdFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("date");
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
    return { dimensions: [], metrics: METRICS.map(m => m.key) };
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
      const associatedCost = adsMap.get(lookupKey) || 0;
      const comissao = getComissaoAfiliado(row);
      const profit = comissao - associatedCost;

      return {
        ...row,
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
  }, [filteredRows, clicks, adSpends, sortBy, sortDir]);

  // Pivot Logic Hook
  const pivotData = useMemo(() => {
    const isPivotMode = pivotConfig.dimensions.length > 0;

    if (!isPivotMode) return joinedData;

    const groups = new Map<string, any>();

    joinedData.forEach(row => {
      // Generate key based on selected dimensions
      const key = pivotConfig.dimensions.map(dim => String(row[dim] || "N/A")).join("_");
      
      const prev = groups.get(key) || {
        ...pivotConfig.dimensions.reduce((acc, dim) => ({ ...acc, [dim]: row[dim] }), {}),
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

    return val;
  };

  const handleExportExcel = () => {
    // Determine dynamic headers based on pivot config
    const headers: string[] = [];
    const keys: string[] = [];

    if (pivotConfig.dimensions.length > 0) {
      pivotConfig.dimensions.forEach(dimKey => {
        headers.push(DIMENSIONS.find(d => d.key === dimKey)?.label || "");
        keys.push(dimKey);
      });
    } else {
      headers.push("Data", "Produto", "Sub ID", "Status");
      keys.push("date", "product", "sub_id1", "status");
    }

    pivotConfig.metrics.forEach(metricKey => {
      headers.push(METRICS.find(m => m.key === metricKey)?.label || "");
      keys.push(metricKey);
    });

    // Prepare data rows
    const wsData = [
      headers,
      ...pivotData.map((row) => keys.map(key => {
        const val = (row as any)[key];
        if (key === "date") return parseDateOnly(val)?.toLocaleDateString("pt-BR") || val;
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
        <Button onClick={handleExportExcel} className="gap-2" variant="accent">
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

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="flex-1 bg-card border border-border rounded-xl p-3 flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all group">
            <div className="p-2 bg-secondary/50 rounded-lg group-focus-within:bg-primary/10 transition-colors">
              <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <Input 
              placeholder="Buscar por nome do produto na lista..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-none focus-visible:ring-0 bg-transparent h-9 p-0 text-sm placeholder:text-muted-foreground/60"
            />
            {searchTerm && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors" 
                onClick={() => setSearchTerm("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 shadow-sm shadow-primary/10">
              <Filter className="w-4 h-4 text-primary" />
            </div>
          </div>

          <Sheet open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-[60px] lg:h-auto lg:py-4 gap-3 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold px-8 rounded-xl border-2 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
                <Settings2 className="w-5 h-5" />
                <span className="text-base uppercase tracking-wider">Criar Tabela Dinâmica</span>
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
            {pivotConfig.dimensions.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-3xl border-2 border-dashed border-primary/20 p-12 lg:p-20 text-center space-y-8 shadow-xl shadow-primary/5 relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                
                <div className="mx-auto w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center rotate-3 group-hover:rotate-6 transition-transform duration-500 shadow-inner">
                  <Settings2 className="w-12 h-12 text-primary animate-pulse" />
                </div>

                <div className="max-w-xl mx-auto space-y-4">
                  <h3 className="text-3xl font-display font-bold text-foreground">Prepare seu Relatório Dinâmico</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Transforme milhares de dados em insights claros. Escolha como deseja <span className="text-primary font-semibold">agrupar suas vendas</span> (por produto, categoria, data ou canal) e quais métricas quer analisar agora.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Button 
                    size="lg"
                    onClick={() => setIsConfigOpen(true)}
                    className="gap-3 h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 text-lg"
                  >
                    <Settings2 className="w-6 h-6" />
                    Começar a montar meu relatório
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
                  <div className="space-y-2 p-4 bg-secondary/30 rounded-2xl border border-border/50">
                    <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center text-primary font-bold shadow-sm">1</div>
                    <p className="text-sm font-semibold">Escolha os Grupos</p>
                    <p className="text-xs text-muted-foreground">Agrupe por Produto, Categoria ou Sub ID para ver totais.</p>
                  </div>
                  <div className="space-y-2 p-4 bg-secondary/30 rounded-2xl border border-border/50">
                    <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center text-accent font-bold shadow-sm">2</div>
                    <p className="text-sm font-semibold">Selecione Valores</p>
                    <p className="text-xs text-muted-foreground">Escolha ver Lucro, Faturamento, Cliques ou ROAS.</p>
                  </div>
                  <div className="space-y-2 p-4 bg-secondary/30 rounded-2xl border border-border/50">
                    <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center text-success font-bold shadow-sm">3</div>
                    <p className="text-sm font-semibold">Exporte Tudo</p>
                    <p className="text-xs text-muted-foreground">Gere um Excel customizado com a sua tabela montada.</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-lg border border-border">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">
                        {pivotConfig.dimensions.length > 0 ? "Tabela Dinâmica Consolidada" : "Relatório Detalhado"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {pivotConfig.dimensions.length > 0 
                          ? `Agrupado por: ${pivotConfig.dimensions.map(d => DIMENSIONS.find(dim => dim.key === d)?.label).join(", ")}`
                          : "Vendas associadas a cliques e custos por Sub ID e Data"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-muted-foreground hover:text-primary gap-2"
                      onClick={() => setPivotConfig({ dimensions: [], metrics: METRICS.map(m => m.key) })}
                    >
                      <X className="w-3 h-3" />
                      Limpar Tabela
                    </Button>
                    <Badge variant="outline" className="font-mono">
                      {pivotData.length} registros
                    </Badge>
                  </div>
                </div>

                <div className="overflow-x-auto">
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
                          // Default Headers (List Mode)
                          <>
                            <TableHead onClick={() => handleSort("date")} className="cursor-pointer">
                              <div className="flex items-center gap-1">Data <ArrowUpDown className="w-3 h-3" /></div>
                            </TableHead>
                            <TableHead onClick={() => handleSort("product")} className="cursor-pointer min-w-[250px]">
                              <div className="flex items-center gap-1">Produto <ArrowUpDown className="w-3 h-3" /></div>
                            </TableHead>
                            <TableHead onClick={() => handleSort("sub_id1")} className="cursor-pointer">
                              <div className="flex items-center gap-1">Sub ID <ArrowUpDown className="w-3 h-3" /></div>
                            </TableHead>
                          </>
                        )}

                        {/* Render Active Metrics Headers */}
                        {pivotConfig.metrics.map(metricKey => {
                          const metric = METRICS.find(m => m.key === metricKey);
                          return (
                            <TableHead key={metricKey} onClick={() => handleSort(metricKey)} className="text-right cursor-pointer">
                              <div className="flex items-center justify-end gap-1">{metric?.label} <ArrowUpDown className="w-3 h-3" /></div>
                            </TableHead>
                          );
                        })}

                        {/* Default Status Header only in list mode if not selected as dimension */}
                        {pivotConfig.dimensions.length === 0 && (
                          <TableHead onClick={() => handleSort("status")} className="cursor-pointer">
                            <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></div>
                          </TableHead>
                        )}
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
                                // Default List Cells
                                <>
                                  <TableCell className="text-xs whitespace-nowrap">
                                    {renderCell(row, "date")}
                                  </TableCell>
                                  <TableCell className="max-w-[300px]">
                                    {renderCell(row, "product")}
                                  </TableCell>
                                  <TableCell>
                                    {renderCell(row, "sub_id1")}
                                  </TableCell>
                                </>
                              )}

                              {/* Render Metric Cells */}
                              {pivotConfig.metrics.map(metricKey => (
                                <TableCell key={metricKey} className="text-right">
                                  {renderCell(row, metricKey)}
                                </TableCell>
                              ))}

                              {/* Default Status Cell only in list mode if not selected as dimension */}
                              {pivotConfig.dimensions.length === 0 && (
                                <TableCell>
                                  {renderCell(row, "status")}
                                </TableCell>
                              )}
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
                {pivotData.length > 100 && (
                  <div className="p-4 text-center border-t border-border bg-secondary/5">
                    <p className="text-xs text-muted-foreground italic">
                      Exibindo apenas os primeiros 100 resultados de {pivotData.length}. Use os filtros acima para refinar sua busca ou exporte para Excel para ver tudo.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;

const ReportsSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-6 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-40" />
          </div>
        ))}
      </div>
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <Skeleton className="h-5 w-40" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
};
