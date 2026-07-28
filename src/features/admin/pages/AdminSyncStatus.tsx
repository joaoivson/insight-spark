import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchUsage,
  fetchSyncUsageSummary,
  fetchSyncHealth,
  fetchSyncRuns,
  SyncHealth,
  SyncRun,
  SyncSourceSummary,
  SyncUsageSummary,
} from "@/services/admin-panel.service";
import { AdminChartTooltip, CHART_COLORS } from "@/features/admin/components/AdminChartTooltip";

const DAYS = 30;

function fill30Days(rows: { date: string; count: number }[]) {
  const map = new Map(rows.map((r) => [r.date.slice(0, 10), r.count]));
  const out: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: map.get(key) ?? 0 });
  }
  return out;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  running: { label: "Rodando", className: "border-transparent bg-blue-500/15 text-blue-600" },
  success: { label: "Sucesso", className: "border-transparent bg-emerald-500/15 text-emerald-600" },
  failed: { label: "Falhou", className: "border-transparent bg-destructive/15 text-destructive" },
  skipped_lock: { label: "Já rodando (skip)", className: "border-transparent bg-amber-500/15 text-amber-600" },
};

function StatusBadge({ run }: { run: SyncRun }) {
  const cfg = STATUS_BADGE[run.status] ?? { label: run.status, className: "" };
  const label = run.is_stale_running ? `${cfg.label} (travada?)` : cfg.label;
  return <Badge className={cfg.className}>{label}</Badge>;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}min ${Math.round(seconds % 60)}s`;
}

function HealthCard({ title, health, loading }: { title: string; health: SyncHealth | null; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : !health ? (
          <p className="text-sm text-muted-foreground">Sem dados</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-semibold text-emerald-600">{health.sucesso}</p>
                <p className="text-xs text-muted-foreground">Sucesso</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-destructive">{health.falha}</p>
                <p className="text-xs text-muted-foreground">Falha</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-amber-600">{health.sem_execucao.length}</p>
                <p className="text-xs text-muted-foreground">Sem execução</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {health.total_ativos} contas ativas · desde{" "}
              {new Date(health.since).toLocaleString("pt-BR")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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

function SyncsTab() {
  const [shopeeHealth, setShopeeHealth] = useState<SyncHealth | null>(null);
  const [facebookHealth, setFacebookHealth] = useState<SyncHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [usage, setUsage] = useState<SyncUsageSummary | null>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    setHealthLoading(true);
    Promise.all([
      fetchSyncHealth("shopee", "cron_full"),
      fetchSyncHealth("facebook", "cron"),
    ])
      .then(([shopee, facebook]) => {
        setShopeeHealth(shopee);
        setFacebookHealth(facebook);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setHealthLoading(false));
  }, []);

  useEffect(() => {
    setUsageLoading(true);
    Promise.all([fetchUsage(), fetchSyncUsageSummary(30)])
      .then(([d, u]) => {
        setUsageData(d);
        setUsage(u);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setUsageLoading(false));
  }, []);

  useEffect(() => {
    setRunsLoading(true);
    fetchSyncRuns({
      source: sourceFilter === "all" ? undefined : sourceFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      limit: 100,
    })
      .then((data) => {
        setRuns(data);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setRunsLoading(false));
  }, [sourceFilter, statusFilter]);

  const chartData = usage ? buildDailyChartData(usage) : [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Última janela de 24h da sincronização de madrugada (full) por fonte — antes disso não
        havia como saber se ela rodou e completou.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <HealthCard title="Shopee — full (madrugada)" health={shopeeHealth} loading={healthLoading} />
        <HealthCard title="Facebook — cron" health={facebookHealth} loading={healthLoading} />
      </div>

      {usageLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SourceStatusCard title="Shopee" summary={usage?.shopee} />
            <SourceStatusCard title="Meta (Facebook)" summary={usage?.facebook} />
          </div>

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
                  {(usageData?.sync_errors || []).map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {e.created_at ? new Date(e.created_at).toLocaleString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell>{e.user_id ?? "—"}</TableCell>
                      <TableCell>{e.source}</TableCell>
                      <TableCell className="max-w-md truncate text-xs">{e.error_message}</TableCell>
                    </TableRow>
                  ))}
                  {(usageData?.sync_errors || []).length === 0 && (
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
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-base">Execuções recentes</CardTitle>
          <div className="flex gap-2">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as fontes</SelectItem>
                <SelectItem value="shopee">Shopee</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="running">Rodando</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="skipped_lock">Já rodando (skip)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {runsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Início</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Aviso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {r.started_at ? new Date(r.started_at).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="capitalize">{r.source}</TableCell>
                    <TableCell className="text-xs">{r.trigger}</TableCell>
                    <TableCell>
                      <StatusBadge run={r} />
                    </TableCell>
                    <TableCell className="text-xs">{formatDuration(r.duration_seconds)}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {r.records_upserted ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{r.user_id ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.is_suspected_partial && (
                        <Badge className="border-transparent bg-amber-500/15 text-amber-600">
                          Possível parcial
                        </Badge>
                      )}
                      {r.error_message && (
                        <span className="block max-w-xs truncate text-destructive" title={r.error_message}>
                          {r.error_message}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {runs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhuma execução encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UsoTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsage()
      .then((d) => {
        setData(d);
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

  const loginsPerDay = fill30Days((data.logins_per_day || []) as { date: string; count: number }[]);
  const loginsTotal = loginsPerDay.reduce((acc, r) => acc + (r.count || 0), 0);
  const loginsAvg = loginsTotal / DAYS;
  const lastLoginDay = [...loginsPerDay].reverse().find((r) => r.count > 0)?.date;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logins (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="text-3xl font-semibold">{loginsTotal}</p>
              <p className="text-xs text-muted-foreground">
                {loginsAvg.toFixed(1).replace(".", ",")}/dia · último acesso:{" "}
                {lastLoginDay ? new Date(lastLoginDay).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
            <div style={{ height: 60 }} className="flex-1 min-w-[200px]">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={loginsPerDay}>
                  <YAxis hide domain={[0, "auto"]} />
                  <Tooltip content={<AdminChartTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#318CE9" strokeWidth={1.5} dot={false} fill="none" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

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

export default function AdminSyncStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "uso" ? "uso" : "syncs";

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        if (v === "uso") setSearchParams({ tab: "uso" });
        else setSearchParams({});
      }}
    >
      <TabsList>
        <TabsTrigger value="syncs">Syncs</TabsTrigger>
        <TabsTrigger value="uso">Uso da plataforma</TabsTrigger>
      </TabsList>
      <TabsContent value="syncs">
        <SyncsTab />
      </TabsContent>
      <TabsContent value="uso">
        <UsoTab />
      </TabsContent>
    </Tabs>
  );
}
