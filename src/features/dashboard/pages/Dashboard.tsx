import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICards, { KPIData } from "@/components/dashboard/KPICards";
import DashboardCharts, { DrillDownType } from "@/components/dashboard/DashboardCharts";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DataTable, { DatasetRow } from "@/components/dashboard/DataTable";
import ChannelPerformance from "@/components/dashboard/ChannelPerformance";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  ShoppingCart,
  Target,
  BarChart2,
  Bell,
  AlertTriangle,
  X,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { useDatasetStore } from "@/stores/datasetStore";
import { useAdSpendsStore } from "@/stores/adSpendsStore";
import { parseDateOnly, isBeforeDateKey, isAfterDateKey } from "@/shared/lib/date";
import { calcTotals } from "@/shared/lib/kpi";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatPercent = (value: number) =>
  `${(value * 100).toFixed(1).replace(".0", "")}%`;

const parseDate = (value?: string | Date) => parseDateOnly(value);

type DrillDownFilter = {
  type: DrillDownType | "all";
  value: string;
  label: string;
} | null;

const Dashboard = () => {
  const { rows, loading: rowsLoading, fetchRows } = useDatasetStore();
  const { adSpends, loading: spendsLoading, fetchAdSpends } = useAdSpendsStore();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [subIdFilter, setSubIdFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // New State for Drill Down
  const [drillDown, setDrillDown] = useState<DrillDownFilter>(null);

  const loading = rowsLoading || spendsLoading;

  useEffect(() => {
    // hydrate from cache or API on first load
    fetchRows({ range: dateRange });
    fetchAdSpends({ range: dateRange });
  }, []);

  const rangeLabel = useMemo(() => {
    if (dateRange.from || dateRange.to) {
      const from = dateRange.from ? new Date(dateRange.from).toLocaleDateString("pt-BR") : "início não definido";
      const to = dateRange.to ? new Date(dateRange.to).toLocaleDateString("pt-BR") : "hoje";
      return `Período aplicado: ${from} a ${to}`;
    }
    return "Período aplicado: todo período";
  }, [dateRange]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && (r.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (categoryFilter && (r.category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (subIdFilter && (r.sub_id1 || "").toLowerCase() !== subIdFilter.toLowerCase()) return false;

      if (dateRange.from) {
        if (isBeforeDateKey(r.date, dateRange.from)) return false;
      }
      if (dateRange.to) {
        if (isAfterDateKey(r.date, dateRange.to)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, categoryFilter, subIdFilter, dateRange]);

  // Table rows filtered by Drill Down
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
    // Smooth scroll to table with offset
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
    const uniqueOrders = new Set(filteredRows.map((r) => (r as any).raw_data?.["ID do pedido"] || r.id)).size;
    const ticketMedio = uniqueOrders ? faturamento / uniqueOrders : 0;
    return { faturamento, comissao, gastoAnuncios, lucro, ticketMedio, roas };
  }, [filteredRows, adSpends, subIdFilter, dateRange]);

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

  const statusOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.status).filter(Boolean))).sort(), [rows]);
  const categoryOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort(), [rows]);
  const subIdOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.sub_id1).filter(Boolean))).sort(), [rows]);

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
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-3">
              <span>{rangeLabel}</span>
            </div>

            <DashboardFilters
              dateRange={dateRange}
              onDateRangeApply={(range) => {
                setDateRange(range);
                // usa cache local + filtro em memória; sem chamadas extras
                fetchRows({ range });
                fetchAdSpends({ range });
              }}
              onClear={() => {
                setStatusFilter("");
                setCategoryFilter("");
                setSubIdFilter("");
                setDateRange({});
                setDrillDown(null);
                fetchRows({ range: {} });
                fetchAdSpends({ range: {} });
              }}
              hasActive={!!dateRange.from || !!dateRange.to || !!statusFilter || !!categoryFilter || !!subIdFilter}
              loading={loading}
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
            />

            {/* Aviso quando zerado */}
            {(!filteredRows.length || totals.faturamento === 0) && (
              <div 
                className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 mb-4 flex items-start gap-3"
                role="alert"
                aria-live="polite"
              >
                <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-700 dark:text-amber-200" aria-hidden="true" />
                <div className="space-y-1 text-amber-900 dark:text-amber-50">
                  <p className="font-semibold text-sm">Sem valores no período selecionado</p>
                  <p className="text-sm text-amber-800 dark:text-amber-100">
                    Ajuste o intervalo de datas ou filtros de status/canal/categoria para visualizar os KPIs. Assim que houver dados, os cards e gráficos serão preenchidos automaticamente.
                  </p>
                </div>
              </div>
            )}

            <KPICards kpis={kpis} onCardClick={handleCardClick} />
            
            {loading ? (
              <DashboardSkeleton />
            ) : (
              <>
            <DashboardCharts
              rows={filteredRows}
              adSpends={adSpends}
              dateRange={dateRange}
              subIdFilter={subIdFilter}
              onDrillDown={handleDrillDown}
              belowRevenueContent={
                <div className="mt-2">
                  {/* Apenas a tabela diária logo abaixo do gráfico de comissão x ads */}
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

            {/* Tabela de Sub ID permanece na posição original (após os gráficos principais) */}
            <div className="mt-8">
              <ChannelPerformance rows={filteredRows} adSpends={adSpends} dateRange={dateRange} showDayTable={false} showHighlights />
            </div>
                
                {drillDown && (
                  <motion.div
                    id="detail-table"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.5 }}
                    className="mt-8"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <span className="text-primary">Dados Detalhados</span>
                        <span className="text-sm font-normal text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                          {drillDown.label}
                        </span>
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
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-8 text-center p-8 border-2 border-dashed border-border rounded-xl bg-secondary/20"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-muted-foreground">
                      Clique em um Card ou Gráfico para ver os detalhes na tabela.
                    </p>
                  </motion.div>
                )}
              </>
            )}
            
            {/* Empty State Warning */}
            {!loading && !rows.length && (
              <div 
                className="mt-8 p-6 bg-warning/10 border border-warning/20 rounded-xl flex flex-col items-center justify-center text-center"
                role="alert"
                aria-live="polite"
              >
                <AlertTriangle className="w-8 h-8 text-warning mb-2" aria-hidden="true" />
                <h3 className="font-semibold text-foreground">Nenhum dado encontrado neste período</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  Se você acabou de fazer upload, verifique se o filtro de data (acima) cobre o período do seu arquivo CSV. Tente selecionar "Últimos 90 dias" ou "Este Ano".
                </p>
              </div>
            )}
          </>
        )}
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
      <div className="bg-card border border-border rounded-xl p-6">
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-4 w-28 mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
};
