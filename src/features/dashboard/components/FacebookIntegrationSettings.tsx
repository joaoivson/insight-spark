import { useEffect, useState } from "react";
import { Loader2, Unplug, Facebook, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  completeFacebookOAuth,
  disconnectFacebook,
  getFacebookOAuthUrl,
  getFacebookStatus,
  listFacebookAdAccounts,
  selectFacebookAdAccounts,
} from "@/services/facebook.service";
import type { FacebookAdAccount, FacebookIntegrationStatus } from "@/shared/types/campaign";

const REDIRECT_PATH = "/dashboard/configuracoes";

// Id no formato "act_123" (usado pela API e armazenado na integração).
const fullAccountId = (a: FacebookAdAccount) => a.id || `act_${a.account_id}`;

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
};

export const FacebookIntegrationSettings = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<FacebookIntegrationStatus | null>(null);
  const [accounts, setAccounts] = useState<FacebookAdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const redirectUri = typeof window !== "undefined" ? `${window.location.origin}${REDIRECT_PATH}` : REDIRECT_PATH;

  const loadStatus = async () => {
    try {
      const s = await getFacebookStatus();
      setStatus(s);
      setSelectedAccounts(s?.ad_account_ids ?? []);
      return s;
    } catch {
      return null;
    }
  };

  const loadAccounts = async () => {
    try {
      const accs = await listFacebookAdAccounts();
      setAccounts(accs);
    } catch (e) {
      toast({ title: "Erro ao listar contas de anúncio", description: (e as Error).message, variant: "destructive" });
    }
  };

  // Captura o ?code=... do retorno do OAuth e finaliza a conexão.
  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        // Limpa a URL para não reprocessar o code
        window.history.replaceState({}, "", REDIRECT_PATH);
        setBusy(true);
        try {
          await completeFacebookOAuth(code, redirectUri);
          toast({ title: "Facebook conectado com sucesso" });
        } catch (e) {
          toast({ title: "Falha ao conectar Facebook", description: (e as Error).message, variant: "destructive" });
        } finally {
          setBusy(false);
        }
      }
      const s = await loadStatus();
      if (s) await loadAccounts();
      setLoading(false);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const url = await getFacebookOAuthUrl(redirectUri);
      window.location.href = url;
    } catch (e) {
      toast({ title: "Erro ao iniciar conexão", description: (e as Error).message, variant: "destructive" });
      setBusy(false);
    }
  };

  const toggleAccount = async (accountId: string, checked: boolean) => {
    const prev = selectedAccounts;
    const next = checked ? [...prev, accountId] : prev.filter((id) => id !== accountId);
    setSelectedAccounts(next);
    setBusy(true);
    try {
      const updated = await selectFacebookAdAccounts(next);
      setStatus(updated);
      toast({ title: "Contas atualizadas", description: "Sincronizando campanhas em segundo plano…" });
    } catch (e) {
      setSelectedAccounts(prev); // rollback
      toast({ title: "Erro ao salvar contas", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectFacebook();
      setStatus(null);
      setAccounts([]);
      setSelectedAccounts([]);
      toast({ title: "Facebook desconectado" });
    } catch (e) {
      toast({ title: "Erro ao desconectar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
      setDisconnectOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
      </div>
    );
  }

  if (!status) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Conecte sua conta do Facebook para sincronizar campanhas, gasto e métricas, e controlar pausar/ativar e
          orçamento direto daqui.
        </p>
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Ao conectar o Meta, o gasto e os cliques do período coberto passam a vir do Meta e substituem
            lançamentos manuais nesse intervalo. Lançamentos anteriores são mantidos.
          </span>
        </div>
        <Button onClick={handleConnect} disabled={busy} className="w-full md:w-auto">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Facebook className="w-4 h-4 mr-2" />}
          Conectar com Facebook
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/25 gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
        </Badge>
        {status.fb_user_name && <span className="text-sm text-muted-foreground">como {status.fb_user_name}</span>}
        <span className="text-xs text-muted-foreground w-full md:w-auto md:ml-auto">Última sync: {formatDate(status.last_sync_at)}</span>
      </div>

      <div className="space-y-2">
        <Label>Contas de anúncio</Label>
        <p className="text-xs text-muted-foreground">Marque uma ou mais contas para sincronizar as campanhas.</p>

        {accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma conta encontrada para este token. Reconecte com uma conta que tenha acesso ao Gerenciador de Anúncios.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border">
            {accounts.map((a) => {
              const id = fullAccountId(a);
              const checked = selectedAccounts.includes(id);
              return (
                <label
                  key={id}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-accent/40"
                >
                  <Checkbox
                    checked={checked}
                    disabled={busy}
                    onCheckedChange={(v) => toggleAccount(id, v === true)}
                    aria-label={`Selecionar ${a.name || id}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{a.name || id}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.account_id}
                      {a.currency ? ` · ${a.currency}` : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" /> As campanhas são sincronizadas automaticamente a cada 1 hora.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        <Button
          variant="outline"
          className="w-full sm:w-auto text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => setDisconnectOpen(true)}
          disabled={busy}
        >
          <Unplug className="w-4 h-4 mr-2" /> Desconectar
        </Button>
      </div>

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar Facebook?</AlertDialogTitle>
            <AlertDialogDescription>
              As campanhas sincronizadas deixarão de ser atualizadas. Você pode reconectar a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} disabled={busy}>
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
