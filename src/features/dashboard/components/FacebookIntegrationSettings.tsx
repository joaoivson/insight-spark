import { useEffect, useRef, useState } from "react";
import { Loader2, Unplug, Facebook, CheckCircle2, Clock, RefreshCw, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { useToast } from "@/hooks/use-toast";
import {
  completeFacebookOAuth,
  disconnectFacebook,
  getFacebookOAuthUrl,
  getFacebookStatus,
  listFacebookAdAccounts,
  resolveFacebookAdAccountNames,
  selectFacebookAdAccounts,
  clearFacebookAdsData,
  triggerFacebookSync,
  FACEBOOK_TOKEN_INVALIDO,
} from "@/services/facebook.service";
import type { FacebookAdAccount, FacebookIntegrationStatus } from "@/shared/types/campaign";
import { usePlanStore } from "@/stores/planStore";

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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deselectAllOpen, setDeselectAllOpen] = useState(false);
  // Conexão existe no banco, mas o token não vale mais no Facebook: a única saída é
  // refazer o OAuth. Sem isso a tela mostrava "Conectado" com a lista de contas vazia.
  const [precisaReconectar, setPrecisaReconectar] = useState(false);
  // Modal de seleção: a lista completa da Graph só é buscada ao ABRIR (lazy), e a
  // seleção vira rascunho local aplicado em lote — 1 PUT, 1 sync, não 1 por clique.
  const [seletorOpen, setSeletorOpen] = useState(false);
  const [modalAccounts, setModalAccounts] = useState<FacebookAdAccount[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState(false);

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

  const refreshAfterConnect = async () => {
    if (usePlanStore.getState().isDemo) return;
    const s = await loadStatus();
    // OAuth refeito com sucesso — o token novo vale, sai do estado de reconexão.
    if (s) setPrecisaReconectar(false);
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

  // Espera o plano (is_demo) antes de tocar no status — evita toast no user demo.
  // No mount só o /status é consultado: a lista completa da Graph fica para o modal.
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
      await loadStatus();
      setLoading(false);
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planLoaded, isDemo]);

  /**
   * Conta selecionada aparecendo como "act_266908603365617" cru significa
   * metadado ausente — a lista só ganhava nome no momento da seleção, então
   * quem conectou antes da coluna (ou reconectou depois) ficava sem nome nem
   * moeda até reabrir o modal e re-salvar. Resolve UMA vez, depois do primeiro
   * paint: o `/status` continua sem tocar na Graph.
   */
  const resolvido = useRef(false);
  useEffect(() => {
    if (resolvido.current || !status || isDemo) return;
    const faltaNome = (status.ad_accounts ?? []).some((c) => !c.name);
    if (!faltaNome || (status.ad_account_ids ?? []).length === 0) return;
    resolvido.current = true;
    void (async () => {
      try {
        setStatus(await resolveFacebookAdAccountNames());
      } catch {
        // Silêncio proposital: o id cru já está na tela e continua utilizável.
        // Falhar aqui não pode virar toast de erro num caminho que a afiliada
        // não pediu e não sabe o que fazer a respeito.
      }
    })();
  }, [status, isDemo]);

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

  const carregarContasDoModal = async () => {
    // Conta demo: nunca chama Graph API (token placeholder).
    if (usePlanStore.getState().isDemo) return;
    setModalLoading(true);
    try {
      const accs = await listFacebookAdAccounts();
      setModalAccounts(accs);
    } catch (e) {
      const erro = e as Error & { code?: string };
      // Erro dentro do modal não pode deixar a usuária presa nele.
      setSeletorOpen(false);
      if (erro.code === FACEBOOK_TOKEN_INVALIDO) {
        setPrecisaReconectar(true);
        return;
      }
      toast({ title: "Erro ao listar contas de anúncio", description: erro.message, variant: "destructive" });
    } finally {
      setModalLoading(false);
    }
  };

  const abrirSeletor = () => {
    setBusca("");
    setAjudaAberta(false);
    setDraftIds(selectedAccounts);
    setSeletorOpen(true);
    void carregarContasDoModal();
  };

  const alternarNoRascunho = (id: string, checked: boolean) => {
    setDraftIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const aplicarLote = async (ids: string[]) => {
    setApplying(true);
    try {
      // Nomes vão junto para o backend persistir — o status passa a exibir as
      // selecionadas sem nova chamada à Graph. O nome já conhecido é o fallback
      // de quem continua marcada mas sumiu da lista da Graph (deixou de ser
      // compartilhada com o app): sem isso, aplicar substituiria o nome dela
      // por null e a conta passaria a aparecer como "act_123" cru.
      const porId = new Map(modalAccounts.map((a) => [fullAccountId(a), a]));
      const conhecido = new Map(
        (status?.ad_accounts ?? []).map((a) => [a.id, a]),
      );
      const updated = await selectFacebookAdAccounts(
        ids,
        ids.map((id) => ({
          id,
          name: porId.get(id)?.name ?? conhecido.get(id)?.name ?? null,
          currency: porId.get(id)?.currency ?? conhecido.get(id)?.currency ?? null,
        })),
      );
      setStatus(updated);
      setSelectedAccounts(updated?.ad_account_ids ?? ids);
      setSeletorOpen(false);
      toast({ title: "Contas atualizadas", description: "Sincronizando em segundo plano…" });
    } catch (e) {
      // Rollback: a seleção só é commitada no sucesso — o rascunho fica no modal.
      const erro = e as Error & { code?: string };
      if (erro.code === FACEBOOK_TOKEN_INVALIDO) {
        setSeletorOpen(false);
        setPrecisaReconectar(true);
        return;
      }
      toast({ title: "Erro ao salvar contas", description: erro.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const aplicarSelecao = async () => {
    // Aplicar com a lista vazia zera a integração inteira (mesmo efeito de
    // "Desconectar"), então pede confirmação em vez de aplicar direto.
    if (draftIds.length === 0 && selectedAccounts.length > 0) {
      setDeselectAllOpen(true);
      return;
    }
    await aplicarLote(draftIds);
  };

  const confirmDeselectAll = async () => {
    setDeselectAllOpen(false);
    await aplicarLote([]);
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectFacebook();
      setStatus(null);
      setModalAccounts([]);
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

  const handleSyncNow = async () => {
    if (!selectedAccounts.length) {
      toast({
        title: "Selecione uma conta",
        description: "Marque ao menos uma conta de anúncio antes de sincronizar.",
        variant: "destructive",
      });
      return;
    }
    setSyncing(true);
    const before = status?.last_sync_at ?? null;
    try {
      await triggerFacebookSync();
      toast({
        title: "Sincronização iniciada",
        description: "Buscando campanhas e gasto no Meta. Pode levar alguns minutos.",
      });
      const start = Date.now();
      while (Date.now() - start < 180_000) {
        await new Promise((r) => setTimeout(r, 5000));
        const s = await loadStatus();
        if (s?.last_sync_at && s.last_sync_at !== before) {
          toast({ title: "Sincronização concluída", description: `Última sync: ${formatDate(s.last_sync_at)}` });
          return;
        }
      }
      toast({
        title: "Sincronização em andamento",
        description: "Os dados devem atualizar em breve — você pode seguir usando o app.",
      });
    } catch (e) {
      toast({
        title: "Não foi possível sincronizar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
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
      <div className="space-y-3">
        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/25 gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Conectado · dados demonstrativos
        </Badge>
        <p className="text-xs text-muted-foreground">
          Esta conta usa dados demonstrativos para treinamento. Nenhuma conta real está conectada.
        </p>
      </div>
    );
  }

  if (!status || status.connection_state === "nunca" || precisaReconectar) {
    return (
      <div className="space-y-3">
        {precisaReconectar && (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/25 gap-1">
            <Unplug className="w-3.5 h-3.5" /> Conexão expirada
          </Badge>
        )}
        <p className="text-xs text-muted-foreground">
          {precisaReconectar
            ? "Sua conexão com o Facebook expirou e as campanhas pararam de sincronizar. Conecte de novo para voltar a receber gasto e métricas."
            : "Conecte sua conta do Facebook para trazer o gasto dos seus anúncios pra dentro do MarketDash."}
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
          {precisaReconectar ? "Reconectar com Facebook" : "Conectar com Facebook"}
        </Button>
      </div>
    );
  }

  // Contas selecionadas vêm do status (nome persistido); fallback só com o id
  // cobre resposta antiga do backend sem `ad_accounts`.
  const contasSelecionadas =
    status.ad_accounts ??
    (status.ad_account_ids ?? []).map((id) => ({
      id,
      name: null as string | null,
      currency: null as string | null,
    }));

  const filtro = busca.trim().toLowerCase();
  const contasFiltradas = filtro
    ? modalAccounts.filter(
        (a) =>
          (a.name ?? "").toLowerCase().includes(filtro) ||
          fullAccountId(a).toLowerCase().includes(filtro) ||
          a.account_id.toLowerCase().includes(filtro),
      )
    : modalAccounts;

  const selecaoMudou =
    draftIds.length !== selectedAccounts.length || draftIds.some((id) => !selectedAccounts.includes(id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/25 gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
        </Badge>
        {status.fb_user_name && <span className="text-xs text-muted-foreground">como {status.fb_user_name}</span>}
        <span className="text-xs text-muted-foreground w-full md:w-auto md:ml-auto">Última sync: {formatDate(status.last_sync_at)}</span>
      </div>

      <div className="space-y-2">
        <Label>Contas de anúncio</Label>

        {contasSelecionadas.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma conta selecionada — as campanhas só sincronizam depois de escolher ao menos uma.
          </p>
        ) : (
          <ul className="rounded-xl border border-border divide-y divide-border">
            {contasSelecionadas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate text-sm text-foreground">{c.name || c.id}</span>
                {c.name && (
                  <span className="flex-shrink-0 text-xs text-muted-foreground tabular-nums">
                    {c.id.replace(/^act_/, "")}
                    {c.currency ? ` · ${c.currency}` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={abrirSeletor}
          disabled={busy || syncing}
        >
          Selecionar contas de anúncio
        </Button>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" /> Sync automática a cada 1 hora — ou use &quot;Sincronizar agora&quot; quando quiser atualizar na hora.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        <Button
          className="w-full sm:w-auto"
          onClick={() => void handleSyncNow()}
          disabled={busy || syncing || selectedAccounts.length === 0}
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {syncing ? "Sincronizando…" : "Sincronizar agora"}
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => setDisconnectOpen(true)}
          disabled={busy || syncing}
        >
          <Unplug className="w-4 h-4 mr-2" /> Desconectar
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setClearOpen(true)}
          disabled={busy || syncing}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Limpar todos os dados de anúncios
        </Button>
      </div>

      <ResponsiveModal
        open={seletorOpen}
        onOpenChange={(open) => {
          if (applying) return;
          setSeletorOpen(open);
          if (!open) setAjudaAberta(false);
        }}
        title="Selecionar contas de anúncio"
        description="Marque as contas cujas campanhas você quer sincronizar."
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou ID"
              className="h-9 pl-8 text-sm"
            />
          </div>

          {modalLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : contasFiltradas.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {modalAccounts.length === 0
                ? "Nenhuma conta encontrada para este token. Reconecte com uma conta que tenha acesso ao Gerenciador de Anúncios."
                : "Nenhuma conta corresponde à busca."}
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto rounded-xl border border-border divide-y divide-border">
              {contasFiltradas.map((a) => {
                const id = fullAccountId(a);
                const checked = draftIds.includes(id);
                return (
                  <label
                    key={id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-accent/40"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={applying}
                      onCheckedChange={(v) => alternarNoRascunho(id, v === true)}
                      aria-label={`Selecionar ${a.name || id}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">{a.name || id}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {a.account_id}
                        {a.currency ? ` · ${a.currency}` : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          <div>
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={() => setAjudaAberta((v) => !v)}
            >
              Não achou uma conta?
            </button>
            {ajudaAberta && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                No login do Facebook, a Meta pede pra você escolher manualmente quais contas/portfólios
                compartilhar com o MarketDash — clique em &quot;Desconectar&quot; e conecte de novo marcando
                essa conta na tela de permissões do Facebook.
              </p>
            )}
          </div>

          <Button
            className="w-full"
            onClick={() => void aplicarSelecao()}
            disabled={applying || modalLoading || !selecaoMudou}
          >
            {applying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Aplicar
          </Button>
        </div>
      </ResponsiveModal>

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

      <AlertDialog open={deselectAllOpen} onOpenChange={setDeselectAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desmarcar todas as contas?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso desconecta a sincronização por completo (mesmo efeito de &quot;Desconectar&quot;) — as campanhas
              deixam de ser atualizadas até você marcar uma conta de novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeselectAll()} disabled={applying}>
              Desmarcar
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
