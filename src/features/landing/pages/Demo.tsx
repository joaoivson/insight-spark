import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  ShoppingCart,
  Target,
  BarChart2,
  TrendingUp,
  X,
  AlertTriangle,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICards, { KPIData } from "@/components/dashboard/KPICards";
import DashboardCharts, { DrillDownType } from "@/components/dashboard/DashboardCharts";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DataTable, { DatasetRow } from "@/components/dashboard/DataTable";
import ChannelPerformance from "@/components/dashboard/ChannelPerformance";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { calcTotals } from "@/shared/lib/kpi";
import { isBeforeDateKey, isAfterDateKey } from "@/shared/lib/date";
import type { AdSpend } from "@/shared/types/adspend";
import { userStorage } from "@/shared/lib/storage";
import { SubscriptionPlanModal } from "@/features/subscription/components/SubscriptionPlanModal";

const demoRows: DatasetRow[] = [
  {
    id: 1,
    date: "2025-11-05",
    time: "10:15",
    mes_ano: "2025-11",
    product: "Kit Pincel",
    product_name: "Kit de Pincéis Premium",
    platform: "Shopee",
    revenue: 4200,
    cost: 0,
    commission: 320,
    profit: 200,
    status: "Concluído",
    category: "Beleza",
    sub_id1: "dispenser01",
    raw_data: {
      "Valor de Compra(R$)": "R$ 4.200,00",
      "Comissão do Item da Shopee(R$)": "R$ 320,00",
      "Comissão líquida do afiliado(R$)": "R$ 280,00",
      "Valor gasto anuncios": "R$ 120,00",
      "ID do pedido": "A-1001",
    },
  },
  {
    id: 2,
    date: "2025-11-12",
    time: "14:35",
    mes_ano: "2025-11",
    product: "Air Fryer",
    product_name: "Air Fryer 5L",
    platform: "Shopee",
    revenue: 8600,
    cost: 0,
    commission: 560,
    profit: 400,
    status: "Concluído",
    category: "Casa",
    sub_id1: "instagram_ads",
    raw_data: {
      "Valor de Compra(R$)": "R$ 8.600,00",
      "Comissão do Item da Shopee(R$)": "R$ 640,00",
      "Comissão líquida do afiliado(R$)": "R$ 520,00",
      "Valor gasto anuncios": "R$ 200,00",
      "ID do pedido": "A-1002",
    },
  },
  {
    id: 3,
    date: "2025-11-20",
    time: "18:10",
    mes_ano: "2025-11",
    product: "Tênis",
    product_name: "Tênis Runner Pro",
    platform: "Instagram",
    revenue: 5100,
    cost: 0,
    commission: 420,
    profit: 280,
    status: "Pendente",
    category: "Moda",
    sub_id1: "instagram_ads",
    raw_data: {
      "Valor de Compra(R$)": "R$ 5.100,00",
      "Comissão do Item da Shopee(R$)": "R$ 420,00",
      "Comissão líquida do afiliado(R$)": "R$ 380,00",
      "Valor gasto anuncios": "R$ 160,00",
      "ID do pedido": "A-1003",
    },
  },
  {
    id: 4,
    date: "2025-12-04",
    time: "09:02",
    mes_ano: "2025-12",
    product: "Fone",
    product_name: "Fone Bluetooth X2",
    platform: "TikTok",
    revenue: 3200,
    cost: 0,
    commission: 260,
    profit: 110,
    status: "Concluído",
    category: "Eletrônicos",
    sub_id1: "tiktok",
    raw_data: {
      "Valor de Compra(R$)": "R$ 3.200,00",
      "Comissão do Item da Shopee(R$)": "R$ 260,00",
      "Comissão líquida do afiliado(R$)": "R$ 230,00",
      "Valor gasto anuncios": "R$ 120,00",
      "ID do pedido": "A-1004",
    },
  },
  {
    id: 5,
    date: "2025-12-10",
    time: "11:45",
    mes_ano: "2025-12",
    product: "Perfume",
    product_name: "Perfume Luxo 100ml",
    platform: "Shopee",
    revenue: 7800,
    cost: 0,
    commission: 540,
    profit: 240,
    status: "Concluído",
    category: "Beleza",
    sub_id1: "dispenser01",
    raw_data: {
      "Valor de Compra(R$)": "R$ 7.800,00",
      "Comissão do Item da Shopee(R$)": "R$ 540,00",
      "Comissão líquida do afiliado(R$)": "R$ 480,00",
      "Valor gasto anuncios": "R$ 240,00",
      "ID do pedido": "A-1005",
    },
  },
  {
    id: 6,
    date: "2025-12-18",
    time: "20:20",
    mes_ano: "2025-12",
    product: "Panela",
    product_name: "Panela Antiaderente",
    platform: "Instagram",
    revenue: 2600,
    cost: 0,
    commission: 190,
    profit: 60,
    status: "Pendente",
    category: "Casa",
    sub_id1: "instagram_ads",
    raw_data: {
      "Valor de Compra(R$)": "R$ 2.600,00",
      "Comissão do Item da Shopee(R$)": "R$ 190,00",
      "Comissão líquida do afiliado(R$)": "R$ 160,00",
      "Valor gasto anuncios": "R$ 100,00",
      "ID do pedido": "A-1006",
    },
  },
  {
    id: 7,
    date: "2026-01-06",
    time: "13:00",
    mes_ano: "2026-01",
    product: "Relógio",
    product_name: "Smartwatch Pro",
    platform: "TikTok",
    revenue: 6900,
    cost: 0,
    commission: 480,
    profit: 200,
    status: "Concluído",
    category: "Eletrônicos",
    sub_id1: "tiktok",
    raw_data: {
      "Valor de Compra(R$)": "R$ 6.900,00",
      "Comissão do Item da Shopee(R$)": "R$ 480,00",
      "Comissão líquida do afiliado(R$)": "R$ 430,00",
      "Valor gasto anuncios": "R$ 230,00",
      "ID do pedido": "A-1007",
    },
  },
  {
    id: 8,
    date: "2026-01-11",
    time: "16:05",
    mes_ano: "2026-01",
    product: "Tapete",
    product_name: "Tapete Antiderrapante",
    platform: "Shopee",
    revenue: 1400,
    cost: 0,
    commission: 110,
    profit: 30,
    status: "Concluído",
    category: "Casa",
    sub_id1: "dispenser01",
    raw_data: {
      "Valor de Compra(R$)": "R$ 1.400,00",
      "Comissão do Item da Shopee(R$)": "R$ 110,00",
      "Comissão líquida do afiliado(R$)": "R$ 90,00",
      "Valor gasto anuncios": "R$ 60,00",
      "ID do pedido": "A-1008",
    },
  },
  {
    id: 9,
    date: "2026-01-18",
    time: "19:40",
    mes_ano: "2026-01",
    product: "Headset",
    product_name: "Headset Gamer",
    platform: "Instagram",
    revenue: 3300,
    cost: 0,
    commission: 240,
    profit: 80,
    status: "Pendente",
    category: "Eletrônicos",
    sub_id1: "instagram_ads",
    raw_data: {
      "Valor de Compra(R$)": "R$ 3.300,00",
      "Comissão do Item da Shopee(R$)": "R$ 240,00",
      "Comissão líquida do afiliado(R$)": "R$ 210,00",
      "Valor gasto anuncios": "R$ 130,00",
      "ID do pedido": "A-1009",
    },
  },
];

const demoAdSpends: AdSpend[] = [
  { id: 1, date: "2025-11-05", amount: 120, sub_id: "dispenser01" },
  { id: 2, date: "2025-11-12", amount: 200, sub_id: "instagram_ads" },
  { id: 3, date: "2025-12-04", amount: 120, sub_id: "tiktok" },
  { id: 4, date: "2025-12-10", amount: 240, sub_id: "dispenser01" },
  { id: 5, date: "2026-01-06", amount: 230, sub_id: "tiktok" },
  { id: 6, date: "2026-01-18", amount: 130, sub_id: "instagram_ads" },
  { id: 7, date: "2025-12-01", amount: 500, sub_id: "Geral/Institucional" },
];

type DrillDownFilter = {
  type: DrillDownType | "all";
  value: string;
  label: string;
} | null;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const Demo = () => {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [subIdFilter, setSubIdFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [drillDown, setDrillDown] = useState<DrillDownFilter>(null);
  const [loading, setLoading] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [checkoutPrefill, setCheckoutPrefill] = useState<{ name?: string; email?: string; cpf_cnpj?: string } | null>(null);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSubscribe = () => {
    const storedUser = userStorage.get() as { email?: string; name?: string; cpf_cnpj?: string } | null;

    if (storedUser) {
      setCheckoutPrefill({ name: storedUser.name, email: storedUser.email, cpf_cnpj: storedUser.cpf_cnpj });
    } else {
      setCheckoutPrefill(null);
    }

    setShowPlanModal(true);
  };

  const rangeLabel = useMemo(() => {
    if (dateRange.from || dateRange.to) {
      const from = dateRange.from ? new Date(dateRange.from).toLocaleDateString("pt-BR") : "início não definido";
      const to = dateRange.to ? new Date(dateRange.to).toLocaleDateString("pt-BR") : "hoje";
      return `Período aplicado: ${from} a ${to}`;
    }
    return "Período aplicado: todo período";
  }, [dateRange]);

  const filteredRows = useMemo(() => {
    return demoRows.filter((r) => {
      if (statusFilter && (r.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (categoryFilter && (r.category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (subIdFilter && (r.sub_id1 || "").toLowerCase() !== subIdFilter.toLowerCase()) return false;
      if (dateRange.from && isBeforeDateKey(r.date, dateRange.from)) return false;
      if (dateRange.to && isAfterDateKey(r.date, dateRange.to)) return false;
      return true;
    });
  }, [statusFilter, categoryFilter, subIdFilter, dateRange]);

  const tableRows = useMemo(() => {
    if (!drillDown) return [];
    if (drillDown.type === "all") return filteredRows;
    return filteredRows.filter((r) => String((r as any)[drillDown.type]) === String(drillDown.value));
  }, [filteredRows, drillDown]);

  const totals = useMemo(() => {
    return calcTotals(filteredRows, demoAdSpends, { dateRange, subIdFilter });
  }, [filteredRows, dateRange, subIdFilter]);

  const kpis: KPIData[] = useMemo(() => {
    return [
      { title: "Faturamento (Pend. + Concl.)", value: formatCurrency(totals.faturamento), icon: DollarSign, iconColor: "text-success" },
      { title: "Comissão (Pend. + Concl.)", value: formatCurrency(totals.comissao), icon: BarChart2, iconColor: "text-primary" },
      { title: "Valor Gasto Anúncios", value: formatCurrency(totals.gastoAnuncios), icon: ShoppingCart, iconColor: "text-warning" },
      { title: "Lucro", value: formatCurrency(totals.lucro), icon: Target, iconColor: "text-accent" },
      { title: "ROAS (Retorno)", value: `${totals.roas.toFixed(2)}x`, icon: TrendingUp, iconColor: "text-success" },
    ];
  }, [totals]);

  const statusOptions = useMemo(() => Array.from(new Set(demoRows.map((r) => r.status).filter(Boolean))).sort(), []);
  const categoryOptions = useMemo(() => Array.from(new Set(demoRows.map((r) => r.category).filter(Boolean))).sort(), []);
  const subIdOptions = useMemo(() => Array.from(new Set(demoRows.map((r) => r.sub_id1).filter(Boolean))).sort(), []);

  const handleDrillDown = (type: DrillDownType, value: string) => {
    setDrillDown({
      type,
      value,
      label: `${type === "mes_ano"
        ? "Mês/Ano"
        : type === "category"
        ? "Categoria"
        : type === "sub_id1"
        ? "Sub ID"
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
    setDrillDown({ type: "all", value: "all", label: `Detalhes de: ${kpi.title}` });
    setTimeout(() => {
      const target = document.getElementById("detail-table");
      if (target) {
        const y = target.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 120);
  };

  return (
    <>
      <DashboardLayout
        title="Demo"
        subtitle="Dashboard completo com dados simulados"
        action={
          <Button onClick={handleSubscribe} variant="hero">
            Assinar Agora
          </Button>
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

              <DashboardFilters
                dateRange={dateRange}
                onDateRangeApply={(range) => setDateRange(range)}
                onClear={() => {
                  setStatusFilter("");
                  setCategoryFilter("");
                  setSubIdFilter("");
                  setDateRange({});
                  setDrillDown(null);
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
                rows={demoRows}
                adSpends={demoAdSpends}
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

              <DashboardCharts
                rows={filteredRows}
                adSpends={demoAdSpends}
                dateRange={dateRange}
                subIdFilter={subIdFilter}
                onDrillDown={handleDrillDown}
                belowRevenueContent={
                  <div className="mt-2">
                    <ChannelPerformance
                      rows={filteredRows}
                      adSpends={demoAdSpends}
                      dateRange={dateRange}
                      showSubTable={false}
                      showDayTable
                      showHighlights={false}
                    />
                  </div>
                }
              />

              <div className="mt-8">
                <ChannelPerformance
                  rows={filteredRows}
                  adSpends={demoAdSpends}
                  dateRange={dateRange}
                  showDayTable={false}
                  showHighlights
                />
              </div>

              {drillDown ? (
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
              ) : (
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
        </motion.div>
      </DashboardLayout>

      <SubscriptionPlanModal
        open={showPlanModal}
        onOpenChange={setShowPlanModal}
        customerData={checkoutPrefill ?? undefined}
      />
    </>
  );
};

export default Demo;

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
