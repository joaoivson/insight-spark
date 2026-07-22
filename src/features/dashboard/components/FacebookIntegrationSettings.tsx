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
  clearFacebookAdsData,
} from "@/services/facebook.service";
import type { FacebookAdAccount, FacebookIntegrationStatus } from "@/shared/types/campaign";
import { usePlanStore } from "@/stores/planStore";
import { Trash2 } from "lucide-react";

const REDIRECT_PATH = "/dashboard/configuracoes";
const META_OAUTH_SUCCESS = "meta_oauth_success";
const META_OAUTH_ERROR = "meta_oauth_error";
const POPUP_FEATURES = "width=600,height=750,menubar=no,toolbar=no";

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

const isOAuthPopup = () =>
  typeof window !== "undefined" && !!window.opener && !window.opener.closed;

export const FacebookIntegrationSettings = () => {
  const { toast } = useToast();
  const { isDemo, loaded: planLoaded, fetch: fetchPlan } = usePlanStore();
  const [status, setStatus] = useState<FacebookIntegrationStatus | null>(null);
  const [accounts, setAccounts] = useState<FacebookAdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

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
    // Conta demo: nunca chama Graph API (token placeholder).
    if (usePlanStore.getState().isDemo) return;
    try {
      const accs = await listFacebookAdAccounts();
      setAccounts(accs);
    } catch (e) {
      toast({ title: "Erro ao listar contas de anúncio", description: (e as Error).message, variant: "destructive" });
    }
  };

  const refreshAfterConnect = async () => {
    if (usePlanStore.getState().isDemo) return;
    const s = await loadStatus();
    if (s) await loadAccounts();
  };

  // Popup OAuth: a aba original escuta o postMessage do callback.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const type = event.data?.type;
      if (type === META_OAUTH_SUCCESS) {
        void (async () => {
          setBusy(true);
          try {
            await refreshAfterConnect();
            toast({ title: "Facebook conectado com sucesso" });
          } finally {
            setBusy(false);
          }
        })();
      } else if (type === META_OAUTH_ERROR) {
        toast({
          title: "Falha ao conectar Facebook",
          description: typeof event.data?.message === "string" ? event.data.message : "Tente novamente.",
          variant: "destructive",
        });
        setBusy(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Espera o plano (is_demo) antes de tocar em status/contas — evita toast no user demo.
  useEffect(() => {
    if (!planLoaded) return;

    const run = async () => {
      if (isDemo) {
        setLoading(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const oauthError = params.get("error_description") || params.get("error");
      const inPopup = isOAuthPopup();

      if (oauthError && !code) {
        window.history.replaceState({}, "", REDIRECT_PATH);
        if (inPopup) {
          window.opener?.postMessage(
            { type: META_OAUTH_ERROR, message: oauthError },
            window.location.origin,
          );
          window.close();
          return;
        }
        toast({ title: "Falha ao conectar Facebook", description: oauthError, variant: "destructive" });
      }

      if (code) {
        // Limpa a URL para não reprocessar o code
        window.history.replaceState({}, "", REDIRECT_PATH);
        setBusy(true);
        try {
          await completeFacebookOAuth(code, redirectUri);
          if (inPopup) {
            window.opener?.postMessage({ type: META_OAUTH_SUCCESS }, window.location.origin);
            window.close();
            return;
          }
          toast({ title: "Facebook conectado com sucesso" });
        } catch (e) {
          const message = (e as Error).message;
          if (inPopup) {
            window.opener?.postMessage({ type: META_OAUTH_ERROR, message }, window.location.origin);
            window.close();
            return;
          }
          toast({ title: "Falha ao conectar Facebook", description: message, variant: "destructive" });
        } finally {
          setBusy(false);
        }
      }
      const s = await loadStatus();
      if (s) await loadAccounts();
      setLoading(false);
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planLoaded, isDemo]);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const url = await getFacebookOAuthUrl(redirectUri);
      // Facilita auditoria: barra do popup trunca; DevTools mostra a URL completa.
      console.info("[facebook-oauth] dialog url", url);
      const popup = window.open(url, "meta_oauth", POPUP_FEATURES);
      if (!popup) {
        // Fallback: popup bloqueado → redirect na mesma aba (comportamento anterior).
        window.location.href = url;
        return;
      }
      // Libera o botão se o usuário fechar o popup sem concluir.
      const timer = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(timer);
          setBusy(false);
        }
      }, 500);
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

  const handleClearAds = async () => {
    setBusy(true);
    try {
      await clearFacebookAdsData();
      toast({ title: "Dados de anúncios removidos" });
    } catch (e) {
      toast({ title: "Erro ao limpar dados", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
      setClearOpen(false);
    }
  };

  if (!planLoaded || loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
      </div>
    );
  }

  if (isDemo) {
    return (
      <div className="space-y-4">
        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/25 gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Conectado · dados demonstrativos
        </Badge>
        <p className="text-sm text-muted-foreground">
          Esta conta usa dados demonstrativos para treinamento. Nenhuma conta real está conectada.
        </p>
      </div>
    );
  }

  if (!status || status.connection_state === "nunca") {
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
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setClearOpen(true)}
          disabled={busy}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Limpar todos os dados de anúncios
        </Button>
      </div>

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar Facebook?</AlertDialogTitle>
            <AlertDialogDescription>
              As campanhas sincronizadas deixarão de ser atualizadas. Você pode reconectar a qualquer momento.
              Os dados históricos não são apagados automaticamente.
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

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todos os dados de anúncios?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga campanhas, gastos (Meta e manual) e cliques desta conta. Dados da Shopee
              (comissões) não são afetados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAds}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Limpar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
