import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Unplug, Facebook, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  selectFacebookAdAccount,
  triggerFacebookSync,
} from "@/services/facebook.service";
import type { FacebookAdAccount, FacebookIntegrationStatus } from "@/shared/types/campaign";

const REDIRECT_PATH = "/dashboard/configuracoes";

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
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const redirectUri = typeof window !== "undefined" ? `${window.location.origin}${REDIRECT_PATH}` : REDIRECT_PATH;

  const loadStatus = async () => {
    try {
      const s = await getFacebookStatus();
      setStatus(s);
      if (s?.ad_account_id) setSelectedAccount(s.ad_account_id);
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

  const handleSelectAccount = async (accountId: string) => {
    setSelectedAccount(accountId);
    setBusy(true);
    try {
      const acc = accounts.find((a) => a.account_id === accountId || a.id === accountId);
      const updated = await selectFacebookAdAccount(accountId, acc?.name ?? null);
      setStatus(updated);
      toast({ title: "Conta de anúncio selecionada" });
    } catch (e) {
      toast({ title: "Erro ao selecionar conta", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    setBusy(true);
    try {
      await triggerFacebookSync();
      toast({ title: "Sincronização iniciada", description: "As campanhas aparecerão em instantes." });
    } catch (e) {
      toast({ title: "Erro ao sincronizar", description: (e as Error).message, variant: "destructive" });
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
      setSelectedAccount("");
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
        <Label>Conta de anúncio</Label>
        <Select value={selectedAccount} onValueChange={handleSelectAccount} disabled={busy}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a conta de anúncio" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.account_id} value={a.account_id}>
                {a.name || a.account_id} {a.currency ? `· ${a.currency}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {accounts.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma conta encontrada para este token. Reconecte com uma conta que tenha acesso ao Gerenciador de Anúncios.
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        <Button variant="outline" onClick={handleSync} disabled={busy || !status.ad_account_id} className="w-full sm:w-auto">
          <RefreshCw className={`w-4 h-4 mr-2 ${busy ? "animate-spin" : ""}`} /> Sincronizar agora
        </Button>
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
