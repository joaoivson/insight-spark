import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchUsage, fetchSyncUsageSummary, SyncSourceSummary, SyncUsageSummary } from "@/services/admin-panel.service";
import { AdminChartTooltip, CHART_COLORS } from "@/features/admin/components/AdminChartTooltip";

function SourceStatusCard({ title, summary }: { title: string; summary: SyncSourceSummary | undefined }) {
  const ok = summary?.last_status === "success";
  const hasRun = !!summary?.last_status;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          {title}
          {hasRun && (
            <Badge
              className={
                ok
                  ? "border-transparent bg-emerald-500/15 text-emerald-600"
                  : "border-transparent bg-destructive/15 text-destructive"
              }
            >
              {ok ? "✓ ok" : "✗ falhou"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Última sync:{" "}
          {summary?.last_sync_at ? new Date(summary.last_sync_at).toLocaleString("pt-BR") : "nunca"}
        </p>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-2xl font-semibold">{summary?.calls_24h ?? 0}</p>
            <p className="text-xs text-muted-foreground">Chamadas 24h</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-destructive">{summary?.errors_24h ?? 0}</p>
            <p className="text-xs text-muted-foreground">Erros 24h</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildDailyChartData(usage: SyncUsageSummary) {
  const byDate: Record<string, any> = {};
  for (const p of usage.daily.shopee) {
    byDate[p.date] = { ...(byDate[p.date] || {}), date: p.date, shopee_success: p.calls - p.errors, shopee_errors: p.errors };
  }
  for (const p of usage.daily.facebook) {
    byDate[p.date] = { ...(byDate[p.date] || {}), date: p.date, facebook_success: p.calls - p.errors, facebook_errors: p.errors };
  }
  return Object.values(byDate).sort((a: any, b: any) => (a.date < b.date ? -1 : 1));
}

export default function AdminUsagePage() {
  const [data, setData] = useState<any>(null);
  const [usage, setUsage] = useState<SyncUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchUsage(), fetchSyncUsageSummary(30)])
      .then(([d, u]) => {
        setData(d);
        setUsage(u);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, []);

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

  const loginsPerDay = (data.logins_per_day || []) as { date: string; count: number }[];
  const loginsTotal = loginsPerDay.reduce((acc, r) => acc + (r.count || 0), 0);
  const daysWithData = loginsPerDay.length || 1;
  const loginsAvg = loginsTotal / daysWithData;
  const lastLoginDay = [...loginsPerDay].reverse().find((r) => r.count > 0)?.date;

  const chartData = usage ? buildDailyChartData(usage) : [];

  return (
    <div className="space-y-6">
      {/* 1. Cards de status por fonte */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SourceStatusCard title="Shopee" summary={usage?.shopee} />
        <SourceStatusCard title="Meta (Facebook)" summary={usage?.facebook} />
      </div>

      {/* 2. Gráfico de chamadas por dia, erro destacado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chamadas de sync por dia (30d)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<AdminChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="shopee_success" stackId="shopee" name="Shopee" fill={CHART_COLORS.blue} radius={[0, 0, 0, 0]} />
              <Bar dataKey="shopee_errors" stackId="shopee" name="Shopee (erro)" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
              <Bar dataKey="facebook_success" stackId="facebook" name="Meta" fill={CHART_COLORS.green} radius={[0, 0, 0, 0]} />
              <Bar dataKey="facebook_errors" stackId="facebook" name="Meta (erro)" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 3. Erros de sync (mantido) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Erros de sync (últimos)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.sync_errors || []).map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {e.created_at ? new Date(e.created_at).toLocaleString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>{e.user_id ?? "—"}</TableCell>
                  <TableCell>{e.source}</TableCell>
                  <TableCell className="max-w-md truncate text-xs">{e.error_message}</TableCell>
                </TableRow>
              ))}
              {(data.sync_errors || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum erro recente
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. Logins — card de número + mini-histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logins (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="text-3xl font-semibold">{loginsTotal}</p>
              <p className="text-xs text-muted-foreground">
                {loginsAvg.toFixed(1)}/dia · último acesso:{" "}
                {lastLoginDay ? new Date(lastLoginDay).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
            <div className="h-16 flex-1 min-w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loginsPerDay}>
                  <Tooltip content={<AdminChartTooltip />} />
                  <Bar dataKey="count" fill={CHART_COLORS.blue} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Telas mais acessadas — bloco secundário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Telas mais acessadas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {(data.top_pages || []).map((p: any) => (
              <li key={p.path} className="flex justify-between gap-4 border-b border-border/40 py-1">
                <code className="truncate text-xs">{p.path}</code>
                <span className="tabular-nums text-muted-foreground">{p.count}</span>
              </li>
            ))}
            {(data.top_pages || []).length === 0 && (
              <li className="text-muted-foreground">Sem page views ainda</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
