import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  addAdminNote,
  centsToBRL,
  fetchAdminClient,
  translateClientStatus,
  translateFrequency,
  translateRejectionReason,
} from "@/services/admin-panel.service";
import { useToast } from "@/hooks/use-toast";

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

export default function AdminClientDetailPage() {
  const { userId } = useParams();
  const id = Number(userId);
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    fetchAdminClient(id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const saveNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addAdminNote(id, note.trim());
      setNote("");
      toast({ title: "Nota salva" });
      load();
    } catch (e) {
      toast({
        title: "Erro ao salvar nota",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-destructive">Cliente não encontrado</p>;
  }

  const phone = data.contact?.phone || data.phone;
  const wa = phone ? `https://wa.me/55${String(phone).replace(/\D/g, "")}` : null;
  const sub = data.subscription_block || {};
  const rejection = data.card_rejection_reason || sub.card_rejection_reason || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/clientes">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Clientes
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{data.name || data.email}</h2>
          <p className="text-sm text-muted-foreground">{data.email}</p>
        </div>
        {data.status && <StatusBadge status={data.status} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Plano: <span className="capitalize font-medium">{sub.plan || data.plan}</span> ·{" "}
              {translateFrequency(sub.frequency || data.frequency)}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              Status: {data.status ? <StatusBadge status={data.status} /> : (sub.status || "—")}
            </p>
            {rejection && (
              <p className="text-amber-700 dark:text-amber-500">
                {translateRejectionReason(rejection)}
              </p>
            )}
            <p>
              Próx. cobrança:{" "}
              {sub.next_payment
                ? new Date(sub.next_payment).toLocaleDateString("pt-BR")
                : "—"}
            </p>
            <p>
              Acesso até:{" "}
              {sub.access_until
                ? new Date(sub.access_until).toLocaleDateString("pt-BR")
                : "—"}
            </p>
            <p>Total pago (líquido): {centsToBRL(data.total_paid_net_cents || 0)}</p>
            <p>Pagamento: {sub.payment_method || "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{data.contact?.email || data.email}</p>
            <p>CPF: {data.contact?.cpf || data.cpf || "—"}</p>
            <p>Telefone: {phone || "—"}</p>
            {wa && (
              <Button asChild size="sm" variant="outline">
                <a href={wa} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uso (30 dias)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Logins: {data.usage?.logins_30d?.length ?? 0}</p>
            <p>
              Shopee sync:{" "}
              {data.usage?.shopee_last_sync
                ? new Date(data.usage.shopee_last_sync).toLocaleString("pt-BR")
                : "—"}
            </p>
            <p>
              Meta sync:{" "}
              {data.usage?.facebook_last_sync
                ? new Date(data.usage.facebook_last_sync).toLocaleString("pt-BR")
                : "—"}
            </p>
            <p>Campanhas Meta: {data.usage?.campaigns_count ?? 0}</p>
            <p>
              Comissão 30d:{" "}
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                data.usage?.commission_30d || 0,
              )}
            </p>
            <p>
              Gasto 30d:{" "}
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                data.usage?.spend_30d || 0,
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas internas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Anotação de suporte..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <Button size="sm" disabled={saving || !note.trim()} onClick={() => void saveNote()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nota"}
            </Button>
            <ul className="space-y-2 text-sm">
              {(data.notes || []).map((n: any) => (
                <li key={n.id} className="rounded-md border p-2">
                  <p>{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.created_at ? new Date(n.created_at).toLocaleString("pt-BR") : ""}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline de eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {(data.timeline || []).map((e: any) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-2">
                <div>
                  <span className="font-medium">{e.event_type}</span>
                  {e.is_plan_change && (
                    <span className="ml-2 text-xs text-amber-600">troca de plano</span>
                  )}
                  {e.card_rejection_reason && (
                    <p className="text-xs text-amber-700 dark:text-amber-500">
                      {translateRejectionReason(e.card_rejection_reason)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{e.plan_name}</p>
                </div>
                <div className="text-right">
                  <p>{e.amount_net_cents != null ? centsToBRL(e.amount_net_cents) : "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.received_at ? new Date(e.received_at).toLocaleString("pt-BR") : ""}
                  </p>
                </div>
              </li>
            ))}
            {(data.timeline || []).length === 0 && (
              <li className="text-muted-foreground">Sem eventos ainda</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
