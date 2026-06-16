import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardKpiCards from "@/components/dashboard/DashboardKpiCards";
import CommissionChart from "@/components/dashboard/CommissionChart";
import CommissionBlocks from "@/components/dashboard/CommissionBlocks";
import CommissionFilters from "@/components/dashboard/CommissionFilters";
import DashboardClicks from "@/components/dashboard/DashboardClicks";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, MousePointerClick, LayoutDashboard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDatasetStore } from "@/stores/datasetStore";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { useClicksStore } from "@/stores/clicksStore";
import { isBeforeDateKey, isAfterDateKey } from "@/shared/lib/date";
import {
  calcDashTotals,
  buildSeries,
  groupByChannel,
  groupByCategoryAll,
  groupBySubIdCommission,
} from "@/shared/lib/chart-utils";
import { normalizeSubId } from "@/shared/lib/utils";
import { useTaxSettingsStore } from "@/stores/taxSettingsStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SUBID_BLOCK_LIMIT = 50; // "os que mais vendem" — top N com scroll interno

const Dashboard = () => {
  const { rows, loading: rowsLoading, fetchRows } = useDatasetStore();
  const { adSpends, loading: spendsLoading, fetchAdSpends } = useAdSpendsStore();
  const { clicks, totalClicks: apiTotalClicks, loading: clicksLoading, fetchClicks } = useClicksStore();
  const adTaxRate = useTaxSettingsStore((s) => s.adTaxRate);
  const commissionTaxRate = useTaxSettingsStore((s) => s.commissionTaxRate);
  const fetchTax = useTaxSettingsStore((s) => s.fetch);
  const tax = useMemo(() => ({ adTaxRate, commissionTaxRate }), [adTaxRate, commissionTaxRate]);
  const hasTax = adTaxRate > 0 || commissionTaxRate > 0;

  const [activeTab, setActiveTab] = useState("comissao");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [subIdFilter, setSubIdFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>(() => {
    // Default: últimos 7 dias até ONTEM (o dia atual é parcial e contamina o ROAS).
    const to = new Date();
    to.setDate(to.getDate() - 1);
    const from = new Date(to);
    from.setDate(to.getDate() - 6);
    return { from, to };
  });

  const loading = rowsLoading || spendsLoading || clicksLoading;

  useEffect(() => {
    fetchRows({ range: dateRange });
    fetchAdSpends({ range: dateRange });
    fetchClicks({ range: dateRange });
    fetchTax();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const opts = useMemo(() => ({ dateRange, subIdFilter, tax }), [dateRange, subIdFilter, tax]);

  const totals = useMemo(() => calcDashTotals(filteredRows, adSpends, opts), [filteredRows, adSpends, opts]);
  const daySeries = useMemo(() => buildSeries(filteredRows, adSpends, opts, "day"), [filteredRows, adSpends, opts]);
  const monthSeries = useMemo(() => buildSeries(filteredRows, adSpends, opts, "month"), [filteredRows, adSpends, opts]);
  const channelData = useMemo(() => groupByChannel(filteredRows, dateRange, tax), [filteredRows, dateRange, tax]);
  const categoryData = useMemo(() => groupByCategoryAll(filteredRows, dateRange, tax), [filteredRows, dateRange, tax]);
  const subIdData = useMemo(
    () => groupBySubIdCommission(filteredRows, dateRange, tax).slice(0, SUBID_BLOCK_LIMIT),
    [filteredRows, dateRange, tax],
  );

  const isEmpty = totals.comissao === 0 && totals.gasto === 0 && totals.orders === 0;

  const statusOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.status).filter(Boolean))).sort(), [rows]);
  const categoryOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort(), [rows]);
  const subIdOptions = useMemo(() => {
    const fromSales = rows.map((r) => normalizeSubId(r.sub_id1)).filter((s) => s !== "Sem Sub ID");
    const fromClicks = clicks.map((c) => normalizeSubId(c.sub_id)).filter((s) => s !== "Sem Sub ID");
    return Array.from(new Set([...fromSales, ...fromClicks])).sort();
  }, [rows, clicks]);

  return (
    <DashboardLayout title="Dashboard">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl border border-accent/20 bg-secondary/40 p-1 shadow-lg shadow-black/20 ring-1 ring-white/5 backdrop-blur-sm md:w-[400px]">
                <TabsTrigger
                  value="comissao"
                  className="flex h-full items-center gap-2 rounded-lg font-bold transition-colors duration-200 data-[state=active]:bg-[rgba(49,140,233,0.12)] data-[state=active]:border data-[state=active]:border-[rgba(49,140,233,0.38)] data-[state=active]:text-[#7CB8F2]"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Comissão
                </TabsTrigger>
                <TabsTrigger
                  value="cliques"
                  className="flex h-full items-center gap-2 rounded-lg font-bold transition-colors duration-200 data-[state=active]:bg-[rgba(49,140,233,0.12)] data-[state=active]:border data-[state=active]:border-[rgba(49,140,233,0.38)] data-[state=active]:text-[#7CB8F2]"
                >
                  <MousePointerClick className="h-4 w-4" />
                  Cliques
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <CommissionFilters
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
            <TabsContent value="comissao" className="mt-0 space-y-6 border-none p-0">
              {loading ? (
                <DashboardSkeleton />
              ) : (
                <>
                  {isEmpty && (
                    <div
                      className="mb-2 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40"
                      role="alert"
                    >
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700 dark:text-amber-200" />
                      <div className="space-y-1 text-amber-900 dark:text-amber-50">
                        <p className="text-sm font-semibold">Sem valores no período selecionado</p>
                        <p className="text-sm">Ajuste os filtros para visualizar os dados.</p>
                      </div>
                    </div>
                  )}

                  <DashboardKpiCards totals={totals} series={daySeries} hasTax={hasTax} />
                  {!isEmpty && (
                    <>
                      <CommissionChart daySeries={daySeries} monthSeries={monthSeries} />
                      <CommissionBlocks channel={channelData} category={categoryData} subId={subIdData} />
                    </>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="cliques" className="mt-0 space-y-8 border-none p-0">
              {loading ? (
                <DashboardSkeleton />
              ) : (
                <DashboardClicks
                  clicks={clicks}
                  totalClicksFromApi={apiTotalClicks}
                  adSpends={adSpends}
                  dateRange={dateRange}
                  subIdFilter={subIdFilter}
                />
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="mb-3 h-6 w-6 rounded-md" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-4 md:p-6">
        <Skeleton className="mb-2 h-5 w-48" />
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
};
