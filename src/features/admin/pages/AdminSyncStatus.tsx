import { useEffect, useState } from "react";
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
import { fetchSyncHealth, fetchSyncRuns, SyncHealth, SyncRun } from "@/services/admin-panel.service";

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

export default function AdminSyncStatusPage() {
  const [shopeeHealth, setShopeeHealth] = useState<SyncHealth | null>(null);
  const [facebookHealth, setFacebookHealth] = useState<SyncHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

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
