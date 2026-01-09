import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { FileText, Download, TrendingUp, Sparkles, ArrowUpRight, CalendarRange } from "lucide-react";
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
import { useMemo, useState } from "react";
import type { DatasetRow } from "@/components/dashboard/DataTable";
import { useDatasetRows } from "@/shared/hooks/useDatasetRows";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const parseDate = (value: string) => {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value || 0) + "%";

const ReportsPage = () => {
  const { rows, loading, refresh } = useDatasetRows();
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [mesAno, setMesAno] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subIdFilter, setSubIdFilter] = useState<string>("all");
  const today = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(today.getDate() - 29);
  const [startDate, setStartDate] = useState<string>(defaultFrom.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(today.toISOString().slice(0, 10));

  const rangeLabel = useMemo(() => {
    if (startDate || endDate) {
      const from = startDate ? new Date(startDate).toLocaleDateString("pt-BR") : "início";
      const to = endDate ? new Date(endDate).toLocaleDateString("pt-BR") : "hoje";
      return `Período: ${from} a ${to}`;
    }
    return "Período: últimos 30 dias";
  }, [startDate, endDate]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (mesAno !== "all" && r.mes_ano !== mesAno) return false;
      if (statusFilter !== "all" && (r.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (categoryFilter !== "all" && (r.category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (subIdFilter !== "all" && (r.sub_id1 || "").toLowerCase() !== subIdFilter.toLowerCase()) return false;
      if (startDate) {
        const sd = parseDate(startDate);
        const rd = parseDate(r.date);
        if (sd && rd && rd < sd) return false;
      }
      if (endDate) {
        const ed = parseDate(endDate);
        const rd = parseDate(r.date);
        if (ed && rd && rd > ed) return false;
      }
      return true;
    });
  }, [rows, mesAno, statusFilter, categoryFilter, subIdFilter, startDate, endDate]);

  const cleanNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      let cleaned = value.replace(/R\$/gi, "").replace(/\s+/g, "");
      const hasComma = cleaned.includes(",");
      const hasDot = cleaned.includes(".");
      if (hasComma && hasDot) cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
      else if (hasComma) cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : 0;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const getFaturamento = (row: DatasetRow) => {
    const raw = (row as any).raw_data || {};
    return cleanNumber(raw["Valor de Compra(R$)"]);
  };

  const getComissao = (row: DatasetRow) => {
    const raw = (row as any).raw_data || {};
    return cleanNumber(raw["Comissão do Item da Shopee(R$)"]);
  };

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
    const map = new Map<
      string,
      {
        revenue: number;
        commission: number;
        profit: number;
        monthDate: Date;
      }
    >();

    filteredRows.forEach((r) => {
      const d = new Date(r.date);
      const year = d.getFullYear().toString();
      if (yearFilter !== "all" && year !== yearFilter) return;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const prev = map.get(monthKey) || { revenue: 0, commission: 0, profit: 0, monthDate: d };
      const faturamento = getFaturamento(r);
      const comissao = getComissao(r);
      const lucro = faturamento - comissao;
      map.set(monthKey, {
        revenue: prev.revenue + faturamento,
        commission: prev.commission + comissao,
        profit: prev.profit + lucro,
        monthDate: d,
      });
      // store label on the map via monthDate locale later
    });

    return Array.from(map.entries())
      .map(([monthKey, vals]) => ({
        monthKey,
        month: vals.monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
        revenue: vals.revenue,
        commission: vals.commission,
        profit: vals.profit,
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredRows, yearFilter]);

  const totalRevenue = monthly.reduce((acc, row) => acc + row.revenue, 0);
  const totalProfit = monthly.reduce((acc, row) => acc + row.profit, 0);
  const ticketMedio = filteredRows.length ? totalRevenue / filteredRows.length : 0;

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
    if (startDate || endDate) filters.push({ label: "Período", value: rangeLabel.replace("Período: ", "") });
    if (yearFilter !== "all") filters.push({ label: "Ano", value: yearFilter });
    return filters;
  }, [mesAno, statusFilter, categoryFilter, subIdFilter, startDate, endDate, rangeLabel, yearFilter]);

  return (
    <DashboardLayout title="Relatórios" subtitle="Análise detalhada dos seus dados">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {loading && !rows.length ? (
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
                dateRange={{ from: startDate ? new Date(startDate) : undefined, to: endDate ? new Date(endDate) : undefined }}
                onDateRangeApply={(range) => {
                  if (!range.from || !range.to) return;
                  const fromVal = new Date(range.from).toISOString().slice(0, 10);
                  const toVal = new Date(range.to).toISOString().slice(0, 10);
                  setStartDate(fromVal);
                  setEndDate(toVal);
                  refresh({ from: fromVal, to: toVal });
                }}
                onClear={() => {
                  setMesAno("all");
                  const today = new Date();
                  const df = new Date();
                  df.setDate(today.getDate() - 29);
                  const fromVal = df.toISOString().slice(0, 10);
                  const toVal = today.toISOString().slice(0, 10);
                  setStartDate(fromVal);
                  setEndDate(toVal);
                  refresh({ from: fromVal, to: toVal });
                }}
                hasActive={
                  (mesAno !== "all") || !!startDate || !!endDate ||
                  statusFilter !== "all" || categoryFilter !== "all" || subIdFilter !== "all"
                }
                loading={loading}
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

            {/* Summary + Insights */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-card rounded-xl border border-primary/10 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center border border-primary/20">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receita Total</span>
                </div>
                <div className="font-display text-3xl font-bold text-foreground">{formatCurrency(totalRevenue)}</div>
                {insights && insights.growth !== null && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="w-4 h-4" />
                    {formatPercent(insights.growth ?? 0)} vs mês anterior
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-accent/10 via-accent/5 to-card rounded-xl border border-accent/10 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center border border-accent/20">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lucro Total</span>
                </div>
                <div className="font-display text-3xl font-bold text-foreground">{formatCurrency(totalProfit)}</div>
                <p className="mt-2 text-xs text-muted-foreground">Lucro = Receita - Comissão</p>
              </div>

              <div className="bg-gradient-to-br from-secondary/15 via-card to-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center border border-secondary/30">
                    <FileText className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Melhor mês</span>
                </div>
                <div className="font-display text-xl font-semibold text-foreground">
                  {insights?.best?.month ?? "—"}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {insights?.best ? formatCurrency(insights.best.profit) : "Sem dados suficientes"}
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50/60 via-card to-card rounded-xl border border-emerald-100/40 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/70 flex items-center justify-center border border-emerald-200/60">
                    <Sparkles className="w-5 h-5 text-emerald-700" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticket médio</span>
                </div>
                <div className="font-display text-3xl font-bold text-foreground">{formatCurrency(ticketMedio)}</div>
                <p className="mt-1 text-sm text-muted-foreground">Baseado em vendas filtradas</p>
              </div>
            </div>

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
            {(!monthly.length || totalRevenue === 0) && (
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
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthly.map((row) => (
                      <TableRow key={row.month} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium text-foreground">{row.month}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.revenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.commission)}</TableCell>
                        <TableCell className="text-right font-bold text-accent">{formatCurrency(row.profit)}</TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-medium">
                          {row.revenue > 0 ? formatPercent((row.profit / row.revenue) * 100) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!monthly.length && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          {loading ? "Carregando dados..." : "Nenhum dado encontrado para os filtros selecionados."}
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
