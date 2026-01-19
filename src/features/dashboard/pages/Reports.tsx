import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICards, { KPIData } from "@/components/dashboard/KPICards";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  CalendarRange,
  DollarSign,
  ShoppingCart,
  Target,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import { useEffect, useMemo, useState } from "react";
import type { DatasetRow } from "@/components/dashboard/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { useDatasetStore } from "@/stores/datasetStore";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { toDateKey, isBeforeDateKey, isAfterDateKey } from "@/shared/lib/date";
import { calcTotals, getFaturamento, getComissaoAfiliado } from "@/shared/lib/kpi";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value || 0) + "%";

const ReportsPage = () => {
  const { rows, loading, fetchRows } = useDatasetStore();
  const { adSpends, loading: spendsLoading, fetchAdSpends } = useAdSpendsStore();
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [mesAno, setMesAno] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subIdFilter, setSubIdFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  useEffect(() => {
    fetchRows({});
    fetchAdSpends({});
  }, []);

  const rangeLabel = useMemo(() => {
    if (dateRange.from || dateRange.to) {
      const from = dateRange.from ? new Date(dateRange.from).toLocaleDateString("pt-BR") : "início";
      const to = dateRange.to ? new Date(dateRange.to).toLocaleDateString("pt-BR") : "hoje";
      return `Período: ${from} a ${to}`;
    }
    return "Período: todo período";
  }, [dateRange]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (mesAno !== "all" && r.mes_ano !== mesAno) return false;
      if (statusFilter !== "all" && (r.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (categoryFilter !== "all" && (r.category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (subIdFilter !== "all" && (r.sub_id1 || "").toLowerCase() !== subIdFilter.toLowerCase()) return false;
      if (dateRange.from) {
        if (isBeforeDateKey(r.date, dateRange.from)) return false;
      }
      if (dateRange.to) {
        if (isAfterDateKey(r.date, dateRange.to)) return false;
      }
      return true;
    });
  }, [rows, mesAno, statusFilter, categoryFilter, subIdFilter, dateRange]);

  const getComissao = (row: DatasetRow) => getComissaoAfiliado(row);

  const years = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(new Date(r.date).getFullYear().toString()));
    return Array.from(set).sort();
  }, [rows]);

  const mesAnoOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.mes_ano).filter(Boolean))).sort(), [rows]);
  const statusOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.status).filter(Boolean))).sort(), [rows]);
  const categoryOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort(), [rows]);
  const subIdOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.sub_id1).filter(Boolean))).sort(), [rows]);

  const monthly = useMemo(() => {
    const spendByMonth = new Map<string, number>();
    adSpends.forEach((spend) => {
      if (subIdFilter !== "all" && spend.sub_id && spend.sub_id !== subIdFilter) return;
      const spendDateKey = toDateKey(spend.date);
      if (dateRange.from && spendDateKey && spendDateKey < toDateKey(dateRange.from)) return;
      if (dateRange.to && spendDateKey && spendDateKey > toDateKey(dateRange.to)) return;
      const monthKey = spendDateKey ? spendDateKey.slice(0, 7) : "";
      if (!monthKey) return;
      spendByMonth.set(monthKey, (spendByMonth.get(monthKey) || 0) + (spend.amount || 0));
    });

    const map = new Map<
      string,
      {
        revenue: number;
        commission: number;
        monthDate: Date;
      }
    >();

    filteredRows.forEach((r) => {
      const d = new Date(r.date);
      const year = d.getFullYear().toString();
      if (yearFilter !== "all" && year !== yearFilter) return;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const prev = map.get(monthKey) || { revenue: 0, commission: 0, monthDate: d };
      const faturamento = getFaturamento(r);
      const comissao = getComissao(r);
      map.set(monthKey, {
        revenue: prev.revenue + faturamento,
        commission: prev.commission + comissao,
        monthDate: d,
      });
    });

    return Array.from(map.entries())
      .map(([monthKey, vals]) => {
        const spend = spendByMonth.get(monthKey) || 0;
        const profit = vals.commission - spend;
        return {
          monthKey,
          month: vals.monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
          revenue: vals.revenue,
          commission: vals.commission,
          spend,
          profit,
        };
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredRows, yearFilter, adSpends, dateRange, subIdFilter]);

  const totals = useMemo(
    () =>
      calcTotals(filteredRows, adSpends, {
        dateRange,
        subIdFilter: subIdFilter !== "all" ? subIdFilter : "",
      }),
    [filteredRows, adSpends, dateRange, subIdFilter]
  );
  const ticketMedio = filteredRows.length ? totals.faturamento / filteredRows.length : 0;


  const kpis: KPIData[] = useMemo(() => {
    const baseKpis = [
      {
        title: "Faturamento (Pend. + Concl.)",
        value: formatCurrency(totals.faturamento),
        icon: DollarSign,
        iconColor: "text-success",
      },
      {
        title: "Comissão (Pend. + Concl.)",
        value: formatCurrency(totals.comissao),
        icon: BarChart2,
        iconColor: "text-primary",
      },
      {
        title: "Valor Gasto Anúncios",
        value: formatCurrency(totals.gastoAnuncios),
        icon: ShoppingCart,
        iconColor: "text-warning",
      },
      {
        title: "Lucro",
        value: formatCurrency(totals.lucro),
        icon: Target,
        iconColor: "text-accent",
      },
    ];

    baseKpis.push({
      title: "ROAS (Retorno)",
      value: `${totals.roas.toFixed(2)}x`,
      icon: TrendingUp,
      iconColor: "text-success",
    });

    return baseKpis;
  }, [totals]);

  const insights = useMemo(() => {
    if (!monthly.length) return null;
    const latest = monthly[monthly.length - 1];
    const previous = monthly.length > 1 ? monthly[monthly.length - 2] : null;
    const growth =
      previous && previous.revenue > 0 ? ((latest.revenue - previous.revenue) / previous.revenue) * 100 : null;
    const best = monthly.reduce((bestRow, curr) => (curr.profit > bestRow.profit ? curr : bestRow), monthly[0]);
    return { latest, previous, growth, best };
  }, [monthly]);

  const activeFilters = useMemo(() => {
    const filters: { label: string; value: string }[] = [];
    if (mesAno !== "all") filters.push({ label: "Mês/Ano", value: mesAno });
    if (statusFilter !== "all") filters.push({ label: "Status", value: statusFilter });
    if (categoryFilter !== "all") filters.push({ label: "Categoria", value: categoryFilter });
    if (subIdFilter !== "all") filters.push({ label: "Canal", value: subIdFilter });
    if (dateRange.from || dateRange.to) filters.push({ label: "Período", value: rangeLabel.replace("Período: ", "") });
    if (yearFilter !== "all") filters.push({ label: "Ano", value: yearFilter });
    return filters;
  }, [mesAno, statusFilter, categoryFilter, subIdFilter, dateRange, rangeLabel, yearFilter]);

  const isLoading = loading || spendsLoading;

  return (
    <DashboardLayout title="Relatórios" subtitle="Análise detalhada dos seus dados">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {isLoading && !rows.length ? (
          <ReportsSkeleton />
        ) : (
          <>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background via-card to-secondary/30 p-6 mb-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_45%)] pointer-events-none" />
              <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground tracking-wide">
                    <Sparkles className="w-4 h-4" />
                    Relatórios inteligentes
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="px-2 py-1 bg-secondary rounded-md border border-secondary/30 flex items-center gap-2">
                      <CalendarRange className="w-4 h-4" />
                      {rangeLabel}
                    </span>
                    <span className="text-xs text-foreground/50">Máx: 60 dias</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled className="gap-2">
                    <Download className="w-4 h-4" />
                    Exportar CSV
                  </Button>
                </div>
              </div>
              {activeFilters.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {activeFilters.map((f) => (
                    <Badge key={f.label + f.value} variant="secondary" className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">{f.label}:</span>
                      <span className="font-medium">{f.value}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Filters Bar */}
            <div className="bg-card rounded-xl border border-border p-4 mb-8 flex flex-wrap items-center gap-3 shadow-sm">
              <DashboardFilters
                mesAnoOptions={mesAnoOptions}
                mesAno={mesAno}
                onMesAnoChange={setMesAno}
                dateRange={dateRange}
                onDateRangeApply={(range) => {
                  setDateRange(range);
                  fetchRows({ range });
                  fetchAdSpends({ range });
                }}
                onClear={() => {
                  setMesAno("all");
                  setDateRange({});
                  fetchRows({ range: {} });
                  fetchAdSpends({ range: {} });
                }}
                hasActive={
                  (mesAno !== "all") || !!dateRange.from || !!dateRange.to ||
                  statusFilter !== "all" || categoryFilter !== "all" || subIdFilter !== "all"
                }
                loading={isLoading}
              />

              <div className="h-8 w-px bg-border mx-1 hidden md:block" />

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s || "unknown"}>{s || "Sem status"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c || "unknown"}>{c || "Sem categoria"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={subIdFilter} onValueChange={setSubIdFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Canal (Sub ID)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Canais</SelectItem>
                  {subIdOptions.map((s) => (
                    <SelectItem key={s} value={s || "unknown"}>{s || "Sem ID"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[100px] bg-background">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <KPICards kpis={kpis} />

            {/* Insights text block */}
            <div className="bg-card rounded-xl border border-border p-4 mb-8 flex flex-wrap items-center gap-3 shadow-sm">
              <div className="p-2 rounded-lg bg-secondary/20 border border-secondary/30">
                <Sparkles className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Utilize os filtros para comparar períodos e canais. Foque nos meses de melhor margem para repetir a estratégia vencedora
                  e observe rapidamente o crescimento mês a mês.
                </p>
              </div>
            </div>

            {/* Evidência de dados vazios */}
            {(!monthly.length || totals.faturamento === 0) && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 mb-8 flex items-start gap-3">
                <div className="mt-0.5 text-amber-700 dark:text-amber-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-amber-900 dark:text-amber-50">
                  <p className="font-semibold text-sm">Nenhum valor encontrado nesse período</p>
                  <p className="text-sm text-amber-800 dark:text-amber-100">
                    Ajuste o intervalo de datas ou selecione outro canal/status para visualizar resultados. Quando houver dados, os cards e a tabela serão preenchidos automaticamente.
                  </p>
                </div>
              </div>
            )}

            {/* Report Table */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border flex items-center gap-3 bg-secondary/5">
                <div className="p-2 bg-background rounded-lg border border-border">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">Relatório Mensal</h3>
                  <p className="text-xs text-muted-foreground">Comparativo de performance por mês</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/20 hover:bg-secondary/20">
                      <TableHead className="w-[200px]">Mês</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-right">Gasto Anúncios</TableHead>
                      <TableHead className="text-right">Lucro (Comissão - Gasto)</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthly.map((row) => (
                      <TableRow key={row.month} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium text-foreground">{row.month}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.revenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.commission)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.spend)}</TableCell>
                        <TableCell
                          className={`text-right font-bold ${row.profit < 0 ? "text-red-500" : "text-emerald-500"}`}
                        >
                          {formatCurrency(row.profit)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${row.spend > 0 && row.revenue / row.spend >= 1 ? "text-emerald-500" : "text-red-500"}`}
                        >
                          {`${(row.spend > 0 ? row.revenue / row.spend : 0).toFixed(2)}x`}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!monthly.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {isLoading ? "Carregando dados..." : "Nenhum dado encontrado para os filtros selecionados."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default ReportsPage;

const ReportsSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-44" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
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
