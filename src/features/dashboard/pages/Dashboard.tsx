import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICards, { KPIData } from "@/components/dashboard/KPICards";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import { motion } from "framer-motion";
import { useMemo, useState, lazy, Suspense } from "react";
import {
  DollarSign,
  ShoppingCart,
  Target,
  BarChart2,
  AlertTriangle,
  TrendingUp,
  MousePointerClick,
  LayoutDashboard
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isBeforeDateKey, isAfterDateKey } from "@/shared/lib/date";
import { calcTotals } from "@/shared/lib/kpi";
import { normalizeSubId } from "@/shared/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDatasetRows } from "@/hooks/queries/useDatasetRows";
import { useAdSpends } from "@/hooks/queries/useAdSpends";
import { useClicks } from "@/hooks/queries/useClicks";

// Lazy loaded heavy components
const DashboardCharts = lazy(() => import("@/components/dashboard/DashboardCharts"));
const ChannelPerformance = lazy(() => import("@/components/dashboard/ChannelPerformance"));
const DashboardClicks = lazy(() => import("@/components/dashboard/DashboardClicks"));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("comissao");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [subIdFilter, setSubIdFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { data: rows = [], isLoading: rowsLoading } = useDatasetRows({
    startDate: dateRange.from?.toISOString().slice(0, 10),
    endDate: dateRange.to?.toISOString().slice(0, 10)
  });

  const { data: adSpends = [], isLoading: spendsLoading } = useAdSpends({
    startDate: dateRange.from?.toISOString().slice(0, 10),
    endDate: dateRange.to?.toISOString().slice(0, 10)
  });

  const { data: clicks = [], isLoading: clicksLoading } = useClicks({
    startDate: dateRange.from?.toISOString().slice(0, 10),
    endDate: dateRange.to?.toISOString().slice(0, 10)
  });

  const loading = rowsLoading || spendsLoading || clicksLoading;

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && (r.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (categoryFilter && (r.category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (subIdFilter && normalizeSubId(r.sub_id1).toLowerCase() !== subIdFilter.toLowerCase()) return false;

      if (dateRange.from && isBeforeDateKey(r.date, dateRange.from)) return false;
      if (dateRange.to && isAfterDateKey(r.date, dateRange.to)) return false;
      return true;
    });
  }, [rows, statusFilter, categoryFilter, subIdFilter, dateRange]);

  const filteredClicks = useMemo(() => {
    return clicks.filter((c) => {
      if (subIdFilter && normalizeSubId(c.sub_id).toLowerCase() !== subIdFilter.toLowerCase()) return false;

      if (dateRange.from && isBeforeDateKey(c.date, dateRange.from)) return false;
      if (dateRange.to && isAfterDateKey(c.date, dateRange.to)) return false;
      return true;
    });
  }, [clicks, subIdFilter, dateRange]);

  const totals = useMemo(() => {
    const { faturamento, comissao, gastoAnuncios, lucro, roas } = calcTotals(filteredRows, adSpends, {
      dateRange,
      subIdFilter,
    });
    return { faturamento, comissao, gastoAnuncios, lucro, roas };
  }, [filteredRows, adSpends, subIdFilter, dateRange]);

  const kpis: KPIData[] = useMemo(() => [
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
      title: "Custos de Anúncios",
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
    {
      title: "ROAS (Retorno)",
      value: `${totals.roas.toFixed(2)}x`,
      icon: TrendingUp,
      iconColor: "text-success",
    },
  ], [totals]);

  const statusOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.status).filter(Boolean))).sort(), [rows]);
  const categoryOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort(), [rows]);
  const subIdOptions = useMemo(() => {
    const fromSales = rows.map((r) => normalizeSubId(r.sub_id1)).filter(s => s !== "Sem Sub ID");
    const fromClicks = clicks.map((c) => normalizeSubId(c.sub_id)).filter(s => s !== "Sem Sub ID");
    return Array.from(new Set([...fromSales, ...fromClicks])).sort();
  }, [rows, clicks]);

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Visão geral dos seus dados"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid w-full grid-cols-2 md:w-[400px] bg-secondary/40 border border-accent/20 p-1 h-12 shadow-2xl shadow-black/40 rounded-xl backdrop-blur-sm ring-1 ring-white/5">
                <TabsTrigger
                  value="comissao"
                  className="flex items-center gap-2 h-full rounded-lg transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 font-bold"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Comissão
                </TabsTrigger>
                <TabsTrigger
                  value="cliques"
                  className="flex items-center gap-2 h-full rounded-lg transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 font-bold"
                >
                  <MousePointerClick className="w-4 h-4" />
                  Cliques
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <DashboardFilters
            dateRange={dateRange}
            onDateRangeApply={(range) => {
              setDateRange(range);
            }}
            onClear={() => {
              setStatusFilter("");
              setCategoryFilter("");
              setSubIdFilter("");
              setDateRange({});
            }}
            hasActive={!!dateRange.from || !!dateRange.to || !!statusFilter || !!categoryFilter || !!subIdFilter}
            loading={loading}
            statusFilter={activeTab === "comissao" ? statusFilter : ""}
            categoryFilter={activeTab === "comissao" ? categoryFilter : ""}
            subIdFilter={subIdFilter}
            onStatusFilterChange={activeTab === "comissao" ? setStatusFilter : undefined}
            onCategoryFilterChange={activeTab === "comissao" ? setCategoryFilter : undefined}
            onSubIdFilterChange={setSubIdFilter}
            statusOptions={statusOptions}
            categoryOptions={categoryOptions}
            subIdOptions={subIdOptions}
            rows={rows}
            adSpends={adSpends}
            clicks={clicks}
          />

          <Tabs value={activeTab} className="w-full">
            <TabsContent value="comissao" className="space-y-8 mt-0 border-none p-0">
              {loading ? (
                <DashboardSkeleton />
              ) : (
                <>
                  {(!filteredRows.length || totals.faturamento === 0) && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 mb-4 flex items-start gap-3" role="alert">
                      <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-700 dark:text-amber-200" />
                      <div className="space-y-1 text-amber-900 dark:text-amber-50">
                        <p className="font-semibold text-sm">Sem valores no período selecionado</p>
                        <p className="text-sm">Ajuste os filtros para visualizar os KPIs de comissão.</p>
                      </div>
                    </div>
                  )}

                  <KPICards kpis={kpis} />

                  <Suspense fallback={<DashboardSkeleton />}>
                    <DashboardCharts
                      rows={filteredRows}
                      adSpends={adSpends}
                      dateRange={dateRange}
                      subIdFilter={subIdFilter}
                      belowRevenueContent={
                        <div className="mt-2">
                          <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-xl" />}>
                            <ChannelPerformance
                              rows={filteredRows}
                              adSpends={adSpends}
                              dateRange={dateRange}
                              showSubTable={false}
                              showDayTable
                              showHighlights={false}
                            />
                          </Suspense>
                        </div>
                      }
                    />
                  </Suspense>

                  <div className="mt-8">
                    <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-xl" />}>
                      <ChannelPerformance rows={filteredRows} adSpends={adSpends} dateRange={dateRange} showDayTable={false} showHighlights />
                    </Suspense>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="cliques" className="space-y-8 mt-0 border-none p-0">
              {loading ? (
                <DashboardSkeleton />
              ) : (
                <>
                  {!filteredClicks.length && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 mb-4 flex items-start gap-3" role="alert">
                      <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-700 dark:text-amber-200" />
                      <div className="space-y-1 text-amber-900 dark:text-amber-50">
                        <p className="font-semibold text-sm">Sem cliques no período selecionado</p>
                        <p className="text-sm">Certifique-se de que o filtro de data cobre o período do seu upload de cliques.</p>
                      </div>
                    </div>
                  )}
                  <Suspense fallback={<DashboardSkeleton />}>
                    <DashboardClicks
                      clicks={filteredClicks}
                      adSpends={adSpends}
                      dateRange={dateRange}
                      subIdFilter={subIdFilter}
                    />
                  </Suspense>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Dashboard;

const DashboardSkeleton = () => {
  return (
    <div className="space-y-4" role="status" aria-label="Carregando dashboard">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20 mt-2" />
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <Skeleton className="h-5 w-48 mb-2" />
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  );
};
