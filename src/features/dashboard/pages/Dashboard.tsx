import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICards, { KPIData } from "@/components/dashboard/KPICards";
import DashboardCharts, { DrillDownType } from "@/components/dashboard/DashboardCharts";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DataTable, { DatasetRow } from "@/components/dashboard/DataTable";
import ChannelPerformance from "@/components/dashboard/ChannelPerformance";
import DashboardClicks from "@/components/dashboard/DashboardClicks";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  ShoppingCart,
  Target,
  BarChart2,
  AlertTriangle,
  X,
  TrendingUp,
  MousePointerClick,
  LayoutDashboard
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDatasetStore } from "@/stores/datasetStore";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { useClicksStore } from "@/stores/clicksStore";
import { isBeforeDateKey, isAfterDateKey } from "@/shared/lib/date";
import { calcTotals } from "@/shared/lib/kpi";
import { normalizeSubId } from "@/shared/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

type DrillDownFilter = {
  type: DrillDownType | "all";
  value: string;
  label: string;
} | null;

const Dashboard = () => {
  const { rows, loading: rowsLoading, fetchRows } = useDatasetStore();
  const { adSpends, loading: spendsLoading, fetchAdSpends } = useAdSpendsStore();
  const { clicks, loading: clicksLoading, fetchClicks } = useClicksStore();
  
  const [activeTab, setActiveTab] = useState("comissao");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [subIdFilter, setSubIdFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  const [drillDown, setDrillDown] = useState<DrillDownFilter>(null);

  const loading = rowsLoading || spendsLoading || clicksLoading;

  useEffect(() => {
    fetchRows({ range: dateRange });
    fetchAdSpends({ range: dateRange });
    fetchClicks({ range: dateRange });
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

  const filteredClicks = useMemo(() => {
    return clicks.filter((c) => {
      if (subIdFilter && normalizeSubId(c.sub_id).toLowerCase() !== subIdFilter.toLowerCase()) return false;
      
      if (dateRange.from && isBeforeDateKey(c.date, dateRange.from)) return false;
      if (dateRange.to && isAfterDateKey(c.date, dateRange.to)) return false;
      return true;
    });
  }, [clicks, subIdFilter, dateRange]);

  const tableRows = useMemo(() => {
    if (!drillDown) return [];
    if (drillDown.type === "all") return filteredRows;

    return filteredRows.filter((r) => {
      const val = (r as any)[drillDown.type];
      return String(val) === String(drillDown.value);
    });
  }, [filteredRows, drillDown]);

  const handleDrillDown = (type: DrillDownType, value: string) => {
    setDrillDown({
      type,
      value,
      label: `${type === "mes_ano"
        ? "Mês/Ano"
        : type === "category"
        ? "Categoria"
        : type === "sub_id1"
        ? "Canal"
        : type === "platform"
        ? "Plataforma"
        : "Produto"}: ${value}`,
    });
    setTimeout(() => {
      const target = document.getElementById("detail-table");
      if (target) {
        const y = target.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 120);
  };

  const handleCardClick = (kpi: KPIData) => {
    setDrillDown({
      type: "all",
      value: "all",
      label: `Detalhes de: ${kpi.title}`,
    });
    setTimeout(() => {
      const target = document.getElementById("detail-table");
      if (target) {
        const y = target.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 120);
  };

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
              <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                <TabsTrigger value="comissao" className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Comissão
                </TabsTrigger>
                <TabsTrigger value="cliques" className="flex items-center gap-2">
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
              fetchRows({ range });
              fetchAdSpends({ range });
              fetchClicks({ range });
            }}
            onClear={() => {
              setStatusFilter("");
              setCategoryFilter("");
              setSubIdFilter("");
              setDateRange({});
              setDrillDown(null);
              // Não recarrega a API, apenas reseta os estados locais que o useMemo usa para filtrar
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

                  <KPICards kpis={kpis} onCardClick={handleCardClick} />
                  
                  <DashboardCharts
                    rows={filteredRows}
                    adSpends={adSpends}
                    dateRange={dateRange}
                    subIdFilter={subIdFilter}
                    onDrillDown={handleDrillDown}
                    belowRevenueContent={
                      <div className="mt-2">
                        <ChannelPerformance
                          rows={filteredRows}
                          adSpends={adSpends}
                          dateRange={dateRange}
                          showSubTable={false}
                          showDayTable
                          showHighlights={false}
                        />
                      </div>
                    }
                  />

                  <div className="mt-8">
                    <ChannelPerformance rows={filteredRows} adSpends={adSpends} dateRange={dateRange} showDayTable={false} showHighlights />
                  </div>
                      
                  {drillDown && (
                    <motion.div id="detail-table" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <span className="text-primary">Dados Detalhados</span>
                          <span className="text-sm font-normal text-muted-foreground bg-secondary px-3 py-1 rounded-full">{drillDown.label}</span>
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setDrillDown(null)}>
                          <X className="w-4 h-4 mr-2" />
                          Fechar Tabela
                        </Button>
                      </div>
                      <DataTable rows={tableRows} />
                    </motion.div>
                  )}

                  {!drillDown && (
                    <div className="mt-8 text-center p-8 border-2 border-dashed border-border rounded-xl bg-secondary/20">
                      <p className="text-muted-foreground">Clique em um Card ou Gráfico para ver os detalhes na tabela.</p>
                    </div>
                  )}
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
                  <DashboardClicks clicks={filteredClicks} adSpends={adSpends} />
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
