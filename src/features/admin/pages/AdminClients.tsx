import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  centsToBRL,
  fetchAdminClients,
  semaphoreLabel,
  translateClientStatus,
  translateFrequency,
  type AdminClient,
} from "@/services/admin-panel.service";
import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";

function SemaphoreDot({ color }: { color: string }) {
  const cls =
    color === "green"
      ? "bg-emerald-500"
      : color === "yellow"
        ? "bg-amber-400"
        : "bg-red-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} title={semaphoreLabel(color)} />;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "atrasado") {
    return (
      <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-600">
        {translateClientStatus(status)}
      </Badge>
    );
  }
  if (status === "ativo") {
    return (
      <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600">
        {translateClientStatus(status)}
      </Badge>
    );
  }
  if (status === "cancelado_com_acesso") {
    return (
      <Badge className="border-sky-500/30 bg-sky-500/15 text-sky-600">
        {translateClientStatus(status)}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      {translateClientStatus(status)}
    </Badge>
  );
}

export default function AdminClientsPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [status, setStatus] = useState(params.get("status") || "");
  const [plan, setPlan] = useState(params.get("plan") || "");
  const [rows, setRows] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      q: q || undefined,
      status: status || undefined,
      plan: plan || undefined,
      expiring_7d: params.get("expiring_7d") === "1",
      payment_failed: params.get("payment_failed") === "1",
      never_connected: params.get("never_connected") === "1",
      no_login_10d: params.get("no_login_10d") === "1",
    }),
    [q, status, plan, params],
  );

  useEffect(() => {
    setLoading(true);
    fetchAdminClients(filters)
      .then((data) => {
        setRows(data);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, [filters]);

  const exportCsv = async () => {
    const res = await fetchWithAuth(getApiUrl("/api/v1/admin/clients/export.csv"));
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin_clients.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAlertFilters = () => {
    const next = new URLSearchParams(params);
    ["expiring_7d", "payment_failed", "never_connected", "no_login_10d"].forEach((k) =>
      next.delete(k),
    );
    setParams(next);
  };

  const hasAlertFilter =
    filters.expiring_7d || filters.payment_failed || filters.never_connected || filters.no_login_10d;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar nome, e-mail ou CPF"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="cancelado_com_acesso">Cancelado c/ acesso</SelectItem>
          </SelectContent>
        </Select>
        <Select value={plan || "all"} onValueChange={(v) => setPlan(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos planos</SelectItem>
            <SelectItem value="essencial">Essencial</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>
        {hasAlertFilter && (
          <Button variant="outline" size="sm" onClick={clearAlertFilters}>
            Limpar alerta
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => void exportCsv()}>
          <Download className="mr-1.5 h-4 w-4" />
          CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Periodicidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Próx. cobrança</TableHead>
                <TableHead>Total pago</TableHead>
                <TableHead>Último login</TableHead>
                <TableHead>Integrações</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.user_id ?? r.email}-${i}`}>
                  <TableCell>
                    {r.user_id ? (
                      <Link className="font-medium hover:underline" to={`/admin/clientes/${r.user_id}`}>
                        {r.name || "—"}
                      </Link>
                    ) : (
                      r.name || "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{r.email}</TableCell>
                  <TableCell className="capitalize">{r.plan}</TableCell>
                  <TableCell>{translateFrequency(r.frequency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.next_payment ? new Date(r.next_payment).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>{centsToBRL(r.total_paid_net_cents)}</TableCell>
                  <TableCell className="text-sm">
                    {r.last_login_at
                      ? new Date(r.last_login_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.integrations?.shopee ? "✓Shopee " : ""}
                    {r.integrations?.facebook ? "✓Meta" : ""}
                    {!r.integrations?.shopee && !r.integrations?.facebook ? "—" : ""}
                  </TableCell>
                  <TableCell>
                    <SemaphoreDot color={r.semaphore} />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
