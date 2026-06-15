import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Link2,
  Unlink,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  ArrowUpDown,
  RefreshCw,
  Plug,
  Search,
  Wallet,
  Coins,
  Target,
  CalendarRange,
  Download,
  MousePointerClick,
  type LucideIcon,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { LinkSubIdModal } from "@/features/dashboard/components/LinkSubIdModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/shared/lib/utils";
import { formatCurrency } from "@/shared/lib/chart-utils";
import { useCampaignsStore } from "@/stores/campaignsStore";
import {
  exportCampaigns,
  getCampaignDetail,
  setCampaignBudget,
  setCampaignStatus,
} from "@/services/campaigns.service";
import { getFacebookStatus, triggerFacebookSync } from "@/services/facebook.service";
import { getShopeeStatus } from "@/services/shopee.service";
import type {
  Campaign,
  CampaignDailyPoint,
  CampaignHealth,
  CampaignStatusFilter,
} from "@/shared/types/campaign";

// Saúde → classes de token semântico (sem cores hardcoded; ver skill ui-shadcn-premium)
const HEALTH_STRIPE: Record<CampaignHealth, string> = {
  healthy: "bg-success",
  warning: "bg-warning",
  loss: "bg-destructive",
  unlinked: "bg-warning",
};

const HEALTH_BORDER: Record<CampaignHealth, string> = {
  healthy: "border-border",
  warning: "border-warning/30",
  loss: "border-destructive/40",
  unlinked: "border-warning/30",
};

type PeriodKey = "7d" | "14d" | "month" | "custom";

const PERIODS: { key: Exclude<PeriodKey, "custom">; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "14d", label: "14 dias" },
  { key: "month", label: "Mês atual" },
];

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const fmtShort = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

// Atalhos vão até o FIM DO DIA ANTERIOR fechado — o dia atual está incompleto e contamina o ROAS.
const periodRange = (key: Exclude<PeriodKey, "custom">): { startDate: string; endDate: string } => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const end = toISO(yesterday);
  if (key === "month") {
    const startISO = toISO(new Date(today.getFullYear(), today.getMonth(), 1));
    // Dia 1 do mês: "ontem" cai no mês passado → usa o próprio dia 1.
    return { startDate: startISO, endDate: end < startISO ? startISO : end };
  }
  const days = key === "7d" ? 7 : 14;
  const start = new Date(yesterday);
  start.setDate(start.getDate() - (days - 1));
  return { startDate: toISO(start), endDate: end };
};

type SortKey = "spend" | "roas" | "profit" | "commission" | "cpc" | "orders";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "spend", label: "Gasto" },
  { key: "roas", label: "ROAS" },
  { key: "profit", label: "Lucro" },
  { key: "commission", label: "Comissão" },
  { key: "cpc", label: "CPC" },
  { key: "orders", label: "Pedidos" },
];

// Sempre decrescente (maior no topo). Não vinculadas vão pro fim nas métricas de comissão.
const SORT_GETTERS: Record<SortKey, (c: Campaign) => number> = {
  spend: (c) => c.metrics.spend,
  roas: (c) => (c.linked && c.metrics.spend > 0 ? c.metrics.roas : -1),
  profit: (c) => (c.linked ? c.metrics.profit : Number.NEGATIVE_INFINITY),
  commission: (c) => (c.linked ? c.metrics.commission : -1),
  cpc: (c) => c.metrics.cpc ?? -1,
  orders: (c) => (c.linked ? c.metrics.orders : -1),
};

const profitClass = (v: number) => (v >= 0 ? "text-success" : "text-destructive");
const roasClass = (roas: number) => (roas >= 1.5 ? "text-success" : roas >= 1 ? "text-warning" : "text-destructive");
const fmtRoas = (r: number) => `${r.toFixed(2)}x`;
const fmtPct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);
const fmtSync = (iso: string | null) => {
  if (!iso) return "nunca";
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
};

const Campanhas = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { campaigns, kpis, hasTax, loading, error, hydrated, fetch, patchCampaign } = useCampaignsStore();

  const [period, setPeriod] = useState<PeriodKey>("7d");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CampaignStatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [healthFilter, setHealthFilter] = useState<CampaignHealth | null>(null);
  const [fbConnected, setFbConnected] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncShopee, setLastSyncShopee] = useState<string | null>(null);

  const range = useMemo(() => {
    if (period === "custom" && customRange?.from && customRange?.to) {
      const [a, b] =
        customRange.from <= customRange.to ? [customRange.from, customRange.to] : [customRange.to, customRange.from];
      return { startDate: toISO(a), endDate: toISO(b) };
    }
    return periodRange(period === "custom" ? "7d" : period);
  }, [period, customRange]);

  const reload = () => {
    fetch({ startDate: range.startDate, endDate: range.endDate, status, search: search || undefined });
  };

  // Recarrega quando o período (ou range personalizado) / status mudam.
  useEffect(() => {
    fetch({ startDate: range.startDate, endDate: range.endDate, status });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.startDate, range.endDate, status]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCampaigns({ startDate: range.startDate, endDate: range.endDate, status, search: search || undefined });
    } catch (e) {
      toast({ title: "Erro ao exportar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Status da integração (para empty state + última sincronização do Facebook)
  useEffect(() => {
    getFacebookStatus()
      .then((s) => {
        setFbConnected(Boolean(s?.ad_account_id));
        setLastSyncAt(s?.last_sync_at ?? null);
      })
      .catch(() => setFbConnected(false));
    getShopeeStatus()
      .then((s) => setLastSyncShopee(s?.last_sync_at ?? null))
      .catch(() => {});
  }, []);

  // Força um sync do Facebook (gasto/CPC/impressões mudam ao longo do dia) e recarrega.
  // A Shopee não entra aqui — ela só atualiza 1x/dia, não tem dado em tempo real.
  const handleSync = async () => {
    setSyncing(true);
    const before = lastSyncAt;
    try {
      await triggerFacebookSync();
      toast({ title: "Atualizando dados do Facebook…", description: "Puxando gasto e CPC mais recentes. Pode levar 1-2 min." });
      const start = Date.now();
      let advanced = false;
      while (Date.now() - start < 240_000) {
        await new Promise((r) => setTimeout(r, 5000));
        const s = await getFacebookStatus().catch(() => null);
        if (s?.last_sync_at && s.last_sync_at !== before) {
          setLastSyncAt(s.last_sync_at);
          advanced = true;
          break;
        }
      }
      reload();
      toast(
        advanced
          ? { title: "Dados atualizados", description: "Gasto e CPC do Facebook sincronizados." }
          : {
              title: "Sincronização em andamento",
              description: "Os dados aparecem em instantes. Se não atualizar, o worker pode estar fora do ar.",
            },
      );
    } catch (e) {
      toast({ title: "Erro ao atualizar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const visibleCampaigns = useMemo(() => {
    let list = campaigns;
    if (healthFilter === "unlinked") list = list.filter((c) => !c.linked);
    else if (healthFilter === "loss") list = list.filter((c) => c.linked && c.metrics.roas < 1 && c.metrics.spend > 0);
    if (search.trim()) {
      const t = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(t));
    }
    const getVal = SORT_GETTERS[sortKey];
    return [...list].sort((a, b) => getVal(b) - getVal(a));
  }, [campaigns, healthFilter, search, sortKey]);

  const unlinkedCount = campaigns.filter((c) => !c.linked).length;
  const unlinkedSpend = campaigns.filter((c) => !c.linked).reduce((acc, c) => acc + c.metrics.spend, 0);
  const lossCount = campaigns.filter((c) => c.linked && c.metrics.roas < 1 && c.metrics.spend > 0).length;

  const showEmptyState = hydrated && !loading && campaigns.length === 0;
  const initialLoading = loading && !hydrated;

  return (
    <DashboardLayout
      title="Campanhas"
      subtitle="Ative, pause e ajuste o orçamento. Vincule ao Sub ID para ver as vendas."
      action={
        <div className="flex items-center gap-2">
          <span className="hidden md:flex flex-col items-end text-[11px] leading-tight text-muted-foreground">
            <span>Facebook · {fmtSync(lastSyncAt)}</span>
            <span>Shopee · {fmtSync(lastSyncShopee)}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || loading || campaigns.length === 0}
          >
            <Download className={cn("w-4 h-4 mr-2", exporting && "animate-pulse")} />
            Exportar
          </Button>
          <Button variant="default" size="sm" onClick={handleSync} disabled={syncing || loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
            {syncing ? "Atualizando…" : "Atualizar dados"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Filtros */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campanha"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatusFilter)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[150px]">
                <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-border bg-card p-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      period === p.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={period === "custom" ? "default" : "outline"} size="sm" className="h-9">
                    <CalendarRange className="mr-2 h-4 w-4" />
                    {period === "custom" && customRange?.from && customRange?.to
                      ? `${fmtShort(customRange.from)} – ${fmtShort(customRange.to)}`
                      : "Personalizado"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={(r) => {
                      setCustomRange(r);
                      setPeriod("custom");
                    }}
                    numberOfMonths={1}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="CPC médio" value={kpis.avg_cpc == null ? "—" : formatCurrency(kpis.avg_cpc)} icon={MousePointerClick} loading={initialLoading} />
          <KpiCard
            label="Gasto"
            value={formatCurrency(hasTax ? kpis.total_spend_with_tax : kpis.total_spend)}
            sub={hasTax ? `sem imposto: ${formatCurrency(kpis.total_spend)}` : undefined}
            icon={Wallet}
            loading={initialLoading}
          />
          <KpiCard
            label="Comissão"
            value={formatCurrency(hasTax ? kpis.total_commission_net : kpis.total_commission)}
            sub={hasTax ? `bruto: ${formatCurrency(kpis.total_commission)}` : undefined}
            icon={Coins}
            loading={initialLoading}
          />
          <KpiCard label="Lucro" value={formatCurrency(kpis.total_profit)} icon={TrendingUp} valueClass={profitClass(kpis.total_profit)} loading={initialLoading} />
          <KpiCard label="ROAS Real" value={fmtRoas(kpis.avg_roas)} icon={Target} valueClass={kpis.avg_roas > 0 ? roasClass(kpis.avg_roas) : undefined} loading={initialLoading} />
          <KpiCard label="Orç./dia" value={formatCurrency(kpis.total_daily_budget)} icon={CalendarRange} valueClass="text-primary" accent loading={initialLoading} />
        </div>

        {/* Avisos */}
        {(unlinkedCount > 0 || lossCount > 0) && !showEmptyState && (
          <div className="flex flex-col gap-3 sm:flex-row">
            {unlinkedCount > 0 && (
              <AlertBanner
                variant="warning"
                active={healthFilter === "unlinked"}
                icon={Unlink}
                title={`${unlinkedCount} campanha${unlinkedCount > 1 ? "s" : ""} sem vínculo`}
                subtitle={`${formatCurrency(unlinkedSpend)} gastos sem vendas atribuídas`}
                onClick={() => setHealthFilter(healthFilter === "unlinked" ? null : "unlinked")}
              />
            )}
            {lossCount > 0 && (
              <AlertBanner
                variant="destructive"
                active={healthFilter === "loss"}
                icon={TrendingDown}
                title={`${lossCount} campanha${lossCount > 1 ? "s" : ""} com ROAS abaixo de 1`}
                subtitle="está gastando mais do que retorna"
                onClick={() => setHealthFilter(healthFilter === "loss" ? null : "loss")}
              />
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Lista */}
        {showEmptyState ? (
          <EmptyState fbConnected={fbConnected} onGoSettings={() => navigate("/dashboard/configuracoes?tab=facebook")} />
        ) : initialLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleCampaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                range={range}
                hasTax={hasTax}
                onPatch={(patch) => patchCampaign(c.id, patch)}
                onChanged={reload}
              />
            ))}
            {visibleCampaigns.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma campanha encontrada com os filtros atuais.
              </p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// ----------------------------------------------------------------------- //

const KpiCard = ({
  label,
  value,
  sub,
  icon: Icon,
  valueClass,
  accent,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  valueClass?: string;
  accent?: boolean;
  loading?: boolean;
}) => (
  <Card className={cn(accent && "border-primary/30")}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1.5">
      <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </CardHeader>
    <CardContent className="p-4 pt-0">
      {loading ? (
        <Skeleton className="h-6 w-20" />
      ) : (
        <>
          <div className={cn("text-lg font-semibold tracking-tight tabular-nums md:text-xl", valueClass)}>{value}</div>
          {sub && <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">{sub}</div>}
        </>
      )}
    </CardContent>
  </Card>
);

const AlertBanner = ({
  variant,
  icon: Icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  variant: "warning" | "destructive";
  icon: LucideIcon;
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) => {
  const tone =
    variant === "warning"
      ? { bg: active ? "bg-warning/15" : "bg-warning/10", border: active ? "border-warning/50" : "border-warning/30", text: "text-warning" }
      : { bg: active ? "bg-destructive/15" : "bg-destructive/10", border: active ? "border-destructive/50" : "border-destructive/30", text: "text-destructive" };
  return (
    <button
      onClick={onClick}
      className={cn("flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors", tone.bg, tone.border)}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", tone.text)} aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ArrowRight className={cn("ml-auto h-4 w-4 flex-shrink-0", tone.text)} aria-hidden="true" />
    </button>
  );
};

const Metric = ({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) => (
  <div className="min-w-0">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className={cn("mt-1 text-sm font-semibold tabular-nums", valueClass)}>{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground tabular-nums">{sub}</p>}
  </div>
);

// ----------------------------------------------------------------------- //

const CampaignCard = ({
  campaign,
  range,
  hasTax,
  onPatch,
  onChanged,
}: {
  campaign: Campaign;
  range: { startDate: string; endDate: string };
  hasTax: boolean;
  onPatch: (patch: Partial<Campaign>) => void;
  onChanged: () => void;
}) => {
  const { toast } = useToast();
  const m = campaign.metrics;

  const [expanded, setExpanded] = useState(false);
  const [daily, setDaily] = useState<CampaignDailyPoint[] | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [busy, setBusy] = useState(false);

  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetValue, setBudgetValue] = useState(String(campaign.daily_budget ?? ""));
  const [linkOpen, setLinkOpen] = useState(false);

  const toggleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && daily == null) {
      setLoadingDaily(true);
      try {
        const detail = await getCampaignDetail(campaign.id, range);
        setDaily(detail.daily);
      } catch (e) {
        toast({ title: "Erro ao carregar dia a dia", variant: "destructive" });
      } finally {
        setLoadingDaily(false);
      }
    }
  };

  const handleToggleActive = async (active: boolean) => {
    setBusy(true);
    onPatch({ is_active: active }); // otimista
    try {
      await setCampaignStatus(campaign.id, active);
      toast({ title: active ? "Campanha ativada" : "Campanha pausada" });
    } catch (e) {
      onPatch({ is_active: !active }); // rollback
      toast({ title: "Não foi possível alterar o status no Facebook", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBudget = async () => {
    const val = parseFloat(budgetValue.replace(",", "."));
    if (isNaN(val) || val <= 0) {
      toast({ title: "Informe um orçamento válido", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await setCampaignBudget(campaign.id, val);
      onPatch({ daily_budget: val });
      setBudgetOpen(false);
      toast({ title: "Orçamento atualizado no Facebook" });
    } catch (e) {
      toast({ title: "Erro ao alterar orçamento", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex overflow-hidden rounded-2xl border bg-card", HEALTH_BORDER[campaign.health])}>
      <span className={cn("w-1 flex-shrink-0", HEALTH_STRIPE[campaign.health])} aria-hidden="true" />
      <div className="min-w-0 flex-1 p-4 md:p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-3">
            <Switch checked={campaign.is_active} disabled={busy} onCheckedChange={handleToggleActive} aria-label="Ativar/pausar campanha" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{campaign.name}</span>
              {campaign.linked ? (
                <button
                  type="button"
                  onClick={() => setLinkOpen(true)}
                  title="Trocar ou desvincular"
                  className="mt-0.5 inline-flex items-center gap-1 rounded text-[11px] text-primary transition-colors hover:text-primary/80 hover:underline"
                >
                  <Link2 className="h-3 w-3" /> {campaign.sub_id}
                </button>
              ) : (
                <span className="text-[11px] text-warning">não vinculada</span>
              )}
            </span>
          </span>
          <span className="flex flex-shrink-0 items-center gap-2">
            {campaign.daily_budget != null && (
              <button
                onClick={() => {
                  setBudgetValue(String(campaign.daily_budget ?? ""));
                  setBudgetOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
              >
                {formatCurrency(campaign.daily_budget)} <Pencil className="h-3 w-3 text-primary" />
              </button>
            )}
            <button
              onClick={toggleExpand}
              aria-label="Expandir"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </span>
        </div>

        {/* Métricas principais (5): Gasto · Comissão · Lucro · ROAS Real · CPC */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Metric
            label="Gasto"
            value={formatCurrency(hasTax ? m.spend_with_tax : m.spend)}
            sub={hasTax ? `sem imposto: ${formatCurrency(m.spend)}` : undefined}
          />
          <Metric
            label="Comissão"
            value={campaign.linked ? formatCurrency(hasTax ? m.commission_net : m.commission) : "—"}
            sub={campaign.linked && hasTax ? `bruto: ${formatCurrency(m.commission)}` : undefined}
          />
          <Metric
            label="Lucro"
            value={campaign.linked ? `${m.profit >= 0 ? "+" : ""}${formatCurrency(m.profit)}` : "—"}
            valueClass={campaign.linked ? profitClass(m.profit) : undefined}
          />
          <Metric
            label="ROAS Real"
            value={campaign.linked && m.spend > 0 ? fmtRoas(m.roas) : "—"}
            valueClass={campaign.linked && m.spend > 0 ? roasClass(m.roas) : undefined}
          />
          <Metric label="CPC" value={m.cpc == null ? "—" : formatCurrency(m.cpc)} />
        </div>

        {/* Não vinculada → CTA */}
        {!campaign.linked && (
          <Button
            variant="outline"
            className="mt-4 w-full border-warning/40 text-warning hover:bg-warning/10 hover:text-warning"
            onClick={() => setLinkOpen(true)}
          >
            <Link2 className="mr-1.5 h-4 w-4" /> Vincular ao Sub ID
          </Button>
        )}

        {/* Expandido */}
        {expanded && (
          <div className="mt-4 border-t border-border pt-4">
            {/* Métricas secundárias (5): Alcance · Cliques · CTR · Pedidos · Diretos */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Metric label="Impressões" value={m.impressions > 0 ? m.impressions.toLocaleString("pt-BR") : "—"} />
              <Metric label="Cliques" value={m.clicks > 0 ? m.clicks.toLocaleString("pt-BR") : "—"} />
              <Metric label="CTR" value={fmtPct(m.ctr)} />
              <Metric label="Pedidos" value={campaign.linked ? String(m.orders) : "—"} />
              <Metric
                label="Diretos"
                value={campaign.linked && m.orders > 0 ? `${m.direct_orders} · ${Math.round((m.direct_orders / m.orders) * 100)}%` : "—"}
              />
            </div>

            <p className="mb-2 mt-5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Desempenho dia a dia</p>
            {loadingDaily ? (
              <Skeleton className="h-20 w-full" />
            ) : daily && daily.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                  <thead>
                    <tr className="text-right text-muted-foreground">
                      <th className="pb-2 text-left font-normal">Data</th>
                      <th className="pb-2 font-normal">Gasto</th>
                      <th className="pb-2 font-normal">CPC</th>
                      <th className="pb-2 font-normal">Comissão</th>
                      <th className="pb-2 font-normal">Lucro</th>
                      <th className="pb-2 font-normal">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((d) => (
                      <tr key={d.date} className="border-t border-border text-right">
                        <td className="py-2 text-left text-muted-foreground">
                          {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
                        </td>
                        <td>{d.spend_with_tax.toFixed(2)}</td>
                        <td>{d.cpc == null ? "—" : d.cpc.toFixed(2)}</td>
                        <td>{d.commission_net.toFixed(2)}</td>
                        <td className={profitClass(d.profit)}>
                          {d.profit >= 0 ? "+" : ""}
                          {d.profit.toFixed(2)}
                        </td>
                        <td className={d.spend > 0 ? roasClass(d.roas) : undefined}>{d.spend > 0 ? fmtRoas(d.roas) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem dados no período.</p>
            )}

            {campaign.linked && (
              <button
                onClick={() => setLinkOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Unlink className="h-3 w-3" /> Alterar vínculo
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal orçamento */}
      <ResponsiveModal
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        title={`Orçamento diário · ${campaign.name}`}
        description="Isso altera o orçamento direto no Facebook."
      >
        <div className="space-y-4">
          <Input
            type="number"
            min="1"
            step="0.01"
            value={budgetValue}
            onChange={(e) => setBudgetValue(e.target.value)}
            placeholder="Ex: 50"
          />
          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <Button variant="outline" className="w-full md:w-auto" onClick={() => setBudgetOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button className="w-full md:w-auto" onClick={handleSaveBudget} disabled={busy}>
              Salvar no Facebook
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* Modal vínculo — seleção de Sub ID por lista (com sugestões e 1:1) */}
      <LinkSubIdModal
        open={linkOpen}
        onOpenChange={setLinkOpen}
        campaign={campaign}
        range={range}
        onLinked={(updated) => {
          onPatch(updated); // atualiza a linha na hora
          onChanged(); // recarrega lista p/ KPIs e avisos
        }}
      />
    </div>
  );
};

const EmptyState = ({ fbConnected, onGoSettings }: { fbConnected: boolean | null; onGoSettings: () => void }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
    <div className="mb-4 rounded-full bg-accent/10 p-4">
      <Plug className="h-8 w-8 text-accent" />
    </div>
    <h3 className="mb-1 text-lg font-semibold">
      {fbConnected ? "Nenhuma campanha sincronizada ainda" : "Conecte sua conta do Facebook"}
    </h3>
    <p className="mb-5 max-w-md text-sm text-muted-foreground">
      {fbConnected
        ? "Sincronize suas campanhas em Configurações ou aguarde a sincronização diária."
        : "Para ver suas campanhas, gasto e ROAS aqui, conecte o Facebook Ads em Configurações."}
    </p>
    <Button onClick={onGoSettings}>
      <Plug className="mr-2 h-4 w-4" /> Ir para Configurações
    </Button>
  </div>
);

export default Campanhas;
