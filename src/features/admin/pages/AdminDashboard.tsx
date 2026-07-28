import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  centsToBRL,
  fetchAdminDashboard,
  formatPlanLabel,
  translateFrequency,
  type AdminDashboard,
} from "@/services/admin-panel.service";
import { useAdminPanelStore } from "@/stores/adminPanelStore";
import { AdminChartTooltip, CHART_COLORS } from "@/features/admin/components/AdminChartTooltip";

/** Remove pontos-zero do INÍCIO da série (histórico ainda não começou) — mantém
 * zeros no meio/fim, que são dado real (ex.: mês sem faturamento de verdade). */
function trimLeadingEmpty<T extends { net: number; gross: number }>(series: T[]): T[] {
  const firstReal = series.findIndex((p) => p.net !== 0 || p.gross !== 0);
  if (firstReal <= 0) return series;
  return series.slice(firstReal);
}

function MetricCard({
  title,
  value,
  sub,
  badge,
}: {
  title: string;
  value: string;
  sub?: string;
  badge?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {badge && (
          <Badge variant="secondary" className="text-[10px] uppercase">
            {badge}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { year, month } = useAdminPanelStore();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAdminDashboard(year, month)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, [year, month]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-destructive">{error || "Sem dados"}</p>;
  }

  const a = data.alerts;
  const alertItems = [
    a.expiring_7d > 0 && { key: "expiring_7d", label: `${a.expiring_7d} vencem em 7 dias` },
    a.payment_failed > 0 && { key: "payment_failed", label: `${a.payment_failed} pagamento falhou` },
    a.never_connected > 0 && { key: "never_connected", label: `${a.never_connected} nunca conectaram` },
    a.no_login_10d > 0 && { key: "no_login_10d", label: `${a.no_login_10d} sem login há 10d` },
  ].filter(Boolean) as { key: string; label: string }[];

  const planBits = Object.entries(data.active_by_plan || {})
    .map(([k, v]) => `${formatPlanLabel(k)} ${v}`)
    .join(" · ");

  const mrrRaw = trimLeadingEmpty(data.series?.mrr || []);
  const mrrSeries = mrrRaw.map((r) => ({ month: r.month, líquido: (r.net || 0) / 100 }));
  const mrrTrimmed = mrrSeries.length < (data.series?.mrr || []).length;

  const revRaw = trimLeadingEmpty(data.series?.revenue || []);
  const revSeries = revRaw.map((r) => ({ month: r.month, líquido: (r.net || 0) / 100 }));
  const revTrimmed = revSeries.length < (data.series?.revenue || []).length;

  const planFreqMaxCount = Math.max(1, ...(data.plan_frequency || []).map((r) => r.count));
  const planFreq = (data.plan_frequency || []).map((r) => ({
    name: `${formatPlanLabel(r.plan)} · ${translateFrequency(r.frequency)}`,
    count: r.count,
    sharePct: Math.round((r.revenue_share || 0) * 100),
    barPct: Math.round((r.count / planFreqMaxCount) * 100),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="MRR"
          badge="hoje"
          value={centsToBRL(data.mrr_net_cents)}
          sub={`líquido · bruto ${centsToBRL(data.mrr_gross_cents)}`}
        />
        <MetricCard
          title="Faturamento"
          value={centsToBRL(data.revenue_net_cents)}
          sub={[
            `líquido · bruto ${centsToBRL(data.revenue_gross_cents)}`,
            data.refund_net_cents
              ? `− ${centsToBRL(data.refund_net_cents)} estornado`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <MetricCard
          title="Assinantes ativos"
          badge="hoje"
          value={String(data.active_count)}
          sub={planBits || undefined}
        />
        <MetricCard title="Novas assinaturas" value={String(data.new_subscriptions)} />
        <MetricCard
          title="Churn"
          value={`${data.churn_count} canceladas · ${((data.churn_rate || 0) * 100).toFixed(1)}%`}
        />
        <MetricCard
          title="Taxa de renovação"
          value={
            data.renewal_rate == null ? "—" : `${((data.renewal_rate || 0) * 100).toFixed(1)}%`
          }
        />
        <MetricCard title="ARPU" badge="hoje" value={centsToBRL(data.arpu_cents)} />
        <MetricCard
          title="LTV estimado"
          badge="hoje"
          value={data.ltv_cents == null ? "—" : centsToBRL(data.ltv_cents)}
        />
      </div>

      {alertItems.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <span className="mr-2">⚠️</span>
          {alertItems.map((item, i) => (
            <span key={item.key}>
              {i > 0 && <span className="mx-2 text-muted-foreground">·</span>}
              <Link
                to={`/admin/clientes?${item.key}=1`}
                className="underline-offset-2 hover:underline"
              >
                {item.label}
              </Link>
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">MRR — últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mrrSeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<AdminChartTooltip valueFormatter={(v) => centsToBRL(Math.round(v * 100))} />} />
                <Line type="monotone" dataKey="líquido" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
          {mrrTrimmed && (
            <p className="px-6 pb-4 text-xs text-muted-foreground">
              A série preenche conforme o histórico acumula.
            </p>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturamento líquido — 12 meses</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revSeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<AdminChartTooltip valueFormatter={(v) => centsToBRL(Math.round(v * 100))} />} />
                <Bar dataKey="líquido" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          {revTrimmed && (
            <p className="px-6 pb-4 text-xs text-muted-foreground">
              A série preenche conforme o histórico acumula.
            </p>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Plano × periodicidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {planFreq.map((r) => (
              <div key={r.name} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 truncate">{r.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${r.barPct}%`, background: CHART_COLORS.blue }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">{r.count}</span>
                <span className="w-14 shrink-0 text-right tabular-nums text-muted-foreground">{r.sharePct}%</span>
              </div>
            ))}
            {planFreq.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem assinantes ativos ainda</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
