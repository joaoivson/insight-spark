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
import { Link } from "react-router-dom";
import { useDatasetStore } from "@/stores/datasetStore";
import { useAdSpendsStore } from "@/stores/adSpendsStore";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatPercent = (value: number) =>
  `${(value * 100).toFixed(1).replace(".0", "")}%`;

const parseDate = (value?: string | Date) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

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
        const sd = parseDate(dateRange.from);
        const rd = parseDate(r.date);
        if (sd && rd && rd < sd) return false;
      }
      if (dateRange.to) {
        const ed = parseDate(dateRange.to);
        const rd = parseDate(r.date);
        if (ed && rd && rd > ed) return false;
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

  const getComissaoAfiliado = (row: DatasetRow) => {
    const raw = (row as any).raw_data || {};
    return cleanNumber(raw["Comissão líquida do afiliado(R$)"]);
  };

  const totals = useMemo(() => {
    const faturamento = filteredRows.reduce((acc, r) => acc + getFaturamento(r), 0);
    const comissao = filteredRows.reduce((acc, r) => acc + getComissaoAfiliado(r), 0);

    const gastoAnuncios = adSpends.reduce((acc, spend) => {
      if (subIdFilter && spend.sub_id !== subIdFilter) return acc;
      const spendDate = new Date(spend.date).toISOString().slice(0, 10);
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from).toISOString().slice(0, 10);
        if (spendDate < fromDate) return acc;
      }
      if (dateRange.to) {
        const toDate = new Date(dateRange.to).toISOString().slice(0, 10);
        if (spendDate > toDate) return acc;
      }
      return acc + (spend.amount || 0);
    }, 0);

    const lucro = comissao - gastoAnuncios;
    const uniqueOrders = new Set(filteredRows.map((r) => (r as any).raw_data?.["ID do pedido"] || r.id)).size;
    const ticketMedio = uniqueOrders ? faturamento / uniqueOrders : 0;
    const roas = gastoAnuncios > 0 ? faturamento / gastoAnuncios : 0;

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
      action={
        !loading && (
          <Button asChild>
            <Link to="/dashboard/investimentos">Gerenciar Investimentos</Link>
          </Button>
        )
      }
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

            {/* Insights automáticos */}
            <InsightsPanel rows={filteredRows} />

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
            />

            <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-background border border-border rounded px-2 py-1 text-foreground">
                <option value="">Status do Pedido (todos)</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s || ""}>{s}</option>
                ))}
              </select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-background border border-border rounded px-2 py-1 text-foreground">
                <option value="">Categoria Global L1 (todas)</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c || ""}>{c}</option>
                ))}
              </select>
              <select value={subIdFilter} onChange={(e) => setSubIdFilter(e.target.value)} className="bg-background border border-border rounded px-2 py-1 text-foreground">
                <option value="">Sub_id1 (todos)</option>
                {subIdOptions.map((s) => (
                  <option key={s} value={s || ""}>{s}</option>
                ))}
              </select>
            </div>

            {/* Aviso quando zerado */}
            {(!filteredRows.length || totals.faturamento === 0) && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 mb-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-700 dark:text-amber-200" />
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
              onDrillDown={handleDrillDown}
              belowRevenueContent={
                <div className="mt-2">
                  {/* Apenas a tabela diária logo abaixo do gráfico de comissão x ads */}
                  <ChannelPerformance
                    rows={filteredRows}
                    adSpends={adSpends}
                    showSubTable={false}
                    showDayTable
                    showHighlights={false}
                  />
                </div>
              }
            />

            {/* Tabela de Sub ID permanece na posição original (após os gráficos principais) */}
            <div className="mt-8">
              <ChannelPerformance rows={filteredRows} adSpends={adSpends} showDayTable={false} showHighlights />
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
                  <div className="mt-8 text-center p-8 border-2 border-dashed border-border rounded-xl bg-secondary/20">
                    <p className="text-muted-foreground">
                      Clique em um Card ou Gráfico para ver os detalhes na tabela.
                    </p>
                  </div>
                )}
              </>
            )}
            
            {/* Empty State Warning */}
            {!loading && !rows.length && (
              <div className="mt-8 p-6 bg-warning/10 border border-warning/20 rounded-xl flex flex-col items-center justify-center text-center">
                <AlertTriangle className="w-8 h-8 text-warning mb-2" />
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

// ----------------------
// Insights Panel
// ----------------------

interface InsightCard {
  title: string;
  description: string;
  tone: "positive" | "warning" | "info";
}

const InsightsPanel = ({ rows }: { rows: DatasetRow[] }) => {
  const insights = useMemo<InsightCard[]>(() => {
    if (!rows.length) return [];

    const totalRevenue = rows.reduce((s, r) => s + (r.revenue || 0), 0);
    const totalProfit = rows.reduce((s, r) => s + (r.profit || 0), 0);
    const margin = totalRevenue ? totalProfit / totalRevenue : 0;

    // Top categoria vs anterior
    const byCat = new Map<string, { revenue: number; count: number }>();
    rows.forEach((r) => {
      const cat = r.category || "Sem categoria";
      const prev = byCat.get(cat) || { revenue: 0, count: 0 };
      byCat.set(cat, { revenue: prev.revenue + (r.revenue || 0), count: prev.count + 1 });
    });
    const sortedCats = Array.from(byCat.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
    const topCat = sortedCats[0];
    const secondCat = sortedCats[1];

    const insightsList: InsightCard[] = [];

    if (topCat) {
      const diff = secondCat ? topCat[1].revenue - secondCat[1].revenue : topCat[1].revenue;
      insightsList.push({
        title: "Categoria líder",
        description: `${topCat[0]} é a líder em receita. Diferença vs próxima: ${formatCurrency(diff)}.`,
        tone: "info",
      });
    }

    // Comparação por canal (sub_id1)
    const byChannel = new Map<string, number>();
    rows.forEach((r) => {
      const ch = r.sub_id1 || "Outros";
      byChannel.set(ch, (byChannel.get(ch) || 0) + (r.revenue || 0));
    });
    const channelsSorted = Array.from(byChannel.entries()).sort((a, b) => b[1] - a[1]);
    if (channelsSorted.length >= 2) {
      const [top, second] = channelsSorted;
      const lift = second[1] ? (top[1] - second[1]) / second[1] : 1;
      insightsList.push({
        title: "Canal mais forte",
        description: `${top[0]} supera ${second[0]} em receita por ${formatPercent(lift)}.`,
        tone: "info",
      });
    }

    // Margem baixa
    if (margin < 0.1) {
      insightsList.push({
        title: "Alerta de margem",
        description: `Margem sobre receita em ${formatPercent(margin)}. Revise custos ou precificação.`,
        tone: "warning",
      });
    }

    // Comissões altas
    const totalCommission = rows.reduce((s, r) => s + (r.commission || 0), 0);
    if (totalRevenue && totalCommission / totalRevenue > 0.25) {
      insightsList.push({
        title: "Comissão elevada",
        description: `Comissões representam ${formatPercent(totalCommission / totalRevenue)} da receita.`,
        tone: "warning",
      });
    }

    return insightsList;
  }, [rows]);

  if (!insights.length) return null;

  const iconByTone = {
    positive: Bell,
    warning: AlertTriangle,
    info: Bell,
  };

  return (
    <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {insights.map((insight, idx) => {
        const Icon = iconByTone[insight.tone];
        const toneClasses =
          insight.tone === "warning"
            ? "border-warning/40 bg-warning/10 text-warning"
            : "border-accent/30 bg-accent/5 text-foreground";
        return (
          <div
            key={`${insight.title}-${idx}`}
            className={`flex items-start gap-3 rounded-xl border p-4 ${toneClasses}`}
          >
            <div className="mt-1 rounded-lg bg-background/60 p-2">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm">{insight.title}</p>
              <p className="text-sm text-foreground/80">{insight.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DashboardSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-32" />
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-72 w-full" />
      </div>
      <div className="bg-card border border-border rounded-xl p-4">
        <Skeleton className="h-4 w-28 mb-3" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
};
