import { useEffect, useState, type ReactNode } from "react";
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
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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
import { PlatformUsageTab } from "@/features/admin/components/PlatformUsageTab";
import { SyncErrorDialog } from "@/features/admin/components/SyncErrorDialog";
import { SyncErrorReasons } from "@/features/admin/components/SyncErrorReasons";
import { ProxyPoolTab } from "@/features/admin/components/ProxyPoolTab";
import {
  CelulaUsuaria,
  Paginacao,
  paginar,
} from "@/features/admin/components/AdminTableFooter";

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
  // Processo morto no meio (deploy/restart/OOM) e fechado depois pelo próprio
  // ciclo. Não é falha de sincronização — cinza, e fora da contagem de erros.
  interrupted: { label: "Interrompida", className: "border-transparent bg-muted text-muted-foreground" },
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

function CollapsibleCardHeader({
  title,
  open,
  onToggle,
  count,
  trailing,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  count?: number;
  trailing?: ReactNode;
}) {
  return (
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-w-0 items-center gap-2 text-left hover:opacity-90"
      >
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <CardTitle className="text-base">{title}</CardTitle>
        {typeof count === "number" && (
          <Badge variant="outline" className="tabular-nums font-normal">
            {count}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">{open ? "Recolher" : "Expandir"}</span>
      </button>
      {trailing ? <div className="flex flex-wrap gap-2">{trailing}</div> : null}
    </CardHeader>
  );
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
            <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
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
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [runsOpen, setRunsOpen] = useState(false);

  // Erros vêm de sync_runs (e não do log antigo): traz usuária, motivo
  // classificado e a mensagem inteira pro modal.
  const [failedRuns, setFailedRuns] = useState<SyncRun[]>([]);
  const [motivoFiltro, setMotivoFiltro] = useState<string | null>(null);
  const [runSelecionada, setRunSelecionada] = useState<SyncRun | null>(null);
  const [paginaErros, setPaginaErros] = useState(1);
  const [paginaRuns, setPaginaRuns] = useState(1);

  useEffect(() => {
    fetchSyncRuns({ status: "failed", limit: 300 })
      .then(setFailedRuns)
      .catch(() => setFailedRuns([]));
  }, []);

  const errosFiltrados = motivoFiltro
    ? failedRuns.filter((r) => r.erro_motivo === motivoFiltro)
    : failedRuns;

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

          <SyncErrorReasons onSelect={(m) => { setMotivoFiltro(m); setPaginaErros(1); setErrorsOpen(true); }} selecionado={motivoFiltro} />

          <Card>
            <CollapsibleCardHeader
              title={motivoFiltro ? `Erros de sync · ${motivoFiltro}` : "Erros de sync (últimos)"}
              open={errorsOpen}
              onToggle={() => setErrorsOpen((v) => !v)}
              count={errosFiltrados.length}
            />
            {errorsOpen && (
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Usuária</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginar(errosFiltrados, paginaErros).map((e) => (
                      <TableRow
                        key={e.id}
                        className="cursor-pointer"
                        onClick={() => setRunSelecionada(e)}
                      >
                        <TableCell className="whitespace-nowrap text-xs">
                          {e.started_at ? new Date(e.started_at).toLocaleString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          <CelulaUsuaria usuario={e.usuario} userId={e.user_id} />
                        </TableCell>
                        <TableCell className="capitalize">{e.source}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {e.erro_motivo ? (
                            <Badge variant="outline" className="font-normal">
                              {e.erro_motivo}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="max-w-md truncate text-xs">
                          {e.error_message}
                        </TableCell>
                      </TableRow>
                    ))}
                    {errosFiltrados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhum erro recente
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <Paginacao
                  pagina={paginaErros}
                  total={errosFiltrados.length}
                  onChange={setPaginaErros}
                />
              </CardContent>
            )}
          </Card>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CollapsibleCardHeader
          title="Execuções recentes"
          open={runsOpen}
          onToggle={() => setRunsOpen((v) => !v)}
          count={runs.length}
          trailing={
            runsOpen ? (
              <>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as fontes</SelectItem>
                    <SelectItem value="shopee">Shopee</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-52">
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
              </>
            ) : undefined
          }
        />
        {runsOpen && (
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
                  {paginar(runs, paginaRuns).map((r) => (
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
                      <TableCell className="whitespace-nowrap text-xs">
                        <CelulaUsuaria usuario={r.usuario} userId={r.user_id} />
                      </TableCell>
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
            <Paginacao pagina={paginaRuns} total={runs.length} onChange={setPaginaRuns} />
          </CardContent>
        )}
      </Card>

      <SyncErrorDialog
        run={runSelecionada}
        onOpenChange={(aberto) => !aberto && setRunSelecionada(null)}
      />
    </div>
  );
}

const UsoTab = PlatformUsageTab;

export default function AdminSyncStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Uso é a aba padrão: é a leitura de negócio. Sistema (syncs + WhatsApp,
  // diagnóstico) fica atrás. "syncs"/"whatsapp" continuam reconhecidos como
  // alias de "sistema" — link antigo salvo/compartilhado não quebra.
  const pedida = searchParams.get("tab");
  const tab = pedida === "syncs" || pedida === "whatsapp" || pedida === "sistema" ? "sistema" : "uso";

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        if (v === "uso") setSearchParams({});
        else setSearchParams({ tab: v });
      }}
    >
      <TabsList>
        <TabsTrigger value="uso">Uso da plataforma</TabsTrigger>
        <TabsTrigger value="sistema">Sistema</TabsTrigger>
      </TabsList>
      <TabsContent value="uso">
        <UsoTab />
      </TabsContent>
      <TabsContent value="sistema" className="space-y-8">
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Sincronizações</h3>
          <SyncsTab />
        </div>
        <div className="border-t border-border pt-8">
          {/* A pergunta que traz o admin aqui é sempre "qual número está em
              qual IP?". A afiliada não vê nada disto — para ela, proxy é
              capacidade de conexão. */}
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            IPs das conexões (proxy)
          </h3>
          <ProxyPoolTab />
        </div>
      </TabsContent>
    </Tabs>
  );
}
