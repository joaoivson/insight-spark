import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  type AdminDashboard,
} from "@/services/admin-panel.service";
import { useAdminPanelStore } from "@/stores/adminPanelStore";

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
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ");

  const mrrSeries = (data.series?.mrr || []).map((r) => ({
    month: r.month,
    líquido: (r.net || 0) / 100,
  }));
  const revSeries = (data.series?.revenue || []).map((r) => ({
    month: r.month,
    líquido: (r.net || 0) / 100,
  }));
  const planFreq = (data.plan_frequency || []).map((r) => ({
    name: `${r.plan}/${r.frequency || "—"}`,
    count: r.count,
    share: Math.round((r.revenue_share || 0) * 100),
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
                <Tooltip formatter={(v: number) => centsToBRL(Math.round(v * 100))} />
                <Line type="monotone" dataKey="líquido" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
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
                <Tooltip formatter={(v: number) => centsToBRL(Math.round(v * 100))} />
                <Bar dataKey="líquido" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Plano × periodicidade</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planFreq}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" name="Qtd" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="share" name="% receita" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
