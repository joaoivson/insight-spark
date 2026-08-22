import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Instagram,
  Loader2,
  RefreshCw,
  Unplug,
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  disconnectInstagram,
  getInstagramAuthUrl,
  getInstagramConnection,
  subscribeInstagramWebhook,
} from "@/services/instagram.service";
import { useInstagramConnectionStore } from "@/stores/instagramConnectionStore";
import type { InstagramConnection } from "@/shared/types/instagram";
import { usePlanStore } from "@/stores/planStore";

const CALLBACK_PATH = "/dashboard/automacoes/callback";
const IG_OAUTH_SUCCESS = "instagram_oauth_success";
const IG_OAUTH_ERROR = "instagram_oauth_error";
const POPUP_FEATURES = "width=600,height=750,menubar=no,toolbar=no";

const formatarData = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
};

/**
 * Checklist antes de conectar.
 *
 * O passo do "Permitir acesso a mensagens" é o mais importante e o único que não
 * dá pra fazer pela nossa tela: sem ele a Meta não entrega o webhook de
 * comentário e a automação simplesmente não dispara, sem erro nenhum.
 */
// PENDENTE DE DESIGN: cada passo deve exibir um print da tela do Instagram
// (`imagem`). O caminho aponta para `public/instagram/`; basta soltar os três
// arquivos lá que a interface passa a mostrá-los — o código já trata a ausência
// deles sem quebrar, exibindo só o texto.
const PASSOS: { titulo: string; texto: string; imagem?: string; destaque?: boolean }[] = [
  {
    titulo: "Conta Profissional e pública",
    texto:
      "No Instagram: Configurações → Tipo de conta e ferramentas → Mudar para conta profissional (Comercial ou Criador de Conteúdo). O perfil precisa estar público — conta privada não recebe notificação de comentário.",
    imagem: "/instagram/passo-1-conta-profissional.png",
  },
  {
    titulo: "Permitir acesso a mensagens",
    texto:
      "No Instagram: Configurações e atividade → Tipo e ferramentas da conta → Ferramentas de mensagem → Controles de mensagem → Pedidos de contato → Ferramentas conectadas → ligue “Permitir acesso às mensagens”.",
    imagem: "/instagram/passo-2-acesso-mensagens.png",
    destaque: true,
  },
  {
    titulo: "Conectar aqui",
    texto: "Clique em Conectar Instagram e autorize o MarketDash na tela da Meta.",
    imagem: "/instagram/passo-3-conectar.png",
  },
];

const Checklist = () => (
  <ol className="space-y-3">
    {PASSOS.map((passo, i) => (
      <li key={passo.titulo} className="flex gap-3">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
          {i + 1}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">{passo.titulo}</span>
          <span className="block text-xs text-muted-foreground">{passo.texto}</span>
          {passo.destaque && (
            <span className="mt-1 block text-xs text-amber-500">
              Sem esse passo a automação não dispara — a Meta não nos avisa dos comentários.
            </span>
          )}
          {passo.imagem && (
            // Print ausente some sem deixar espaço vazio nem ícone quebrado.
            <img
              src={passo.imagem}
              alt=""
              loading="lazy"
              className="mt-2 max-w-[220px] rounded-lg border border-border"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </span>
      </li>
    ))}
  </ol>
);

export const InstagramConnectionSettings = () => {
  const { toast } = useToast();
  const { isDemo, loaded: planLoaded, fetch: fetchPlan } = usePlanStore();
  const recarregarConexao = useInstagramConnectionStore((s) => s.fetch);

  const [conexao, setConexao] = useState<InstagramConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [desconectarAberto, setDesconectarAberto] = useState(false);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  const redirectUri =
    typeof window !== "undefined" ? `${window.location.origin}${CALLBACK_PATH}` : CALLBACK_PATH;

  const carregar = async () => {
    try {
      const c = await getInstagramConnection();
      setConexao(c);
      return c;
    } catch {
      return null;
    }
  };

  // O popup do OAuth avisa esta aba quando termina.
  useEffect(() => {
    const aoReceber = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const tipo = event.data?.type;
      if (tipo === IG_OAUTH_SUCCESS) {
        void (async () => {
          setBusy(true);
          try {
            await carregar();
            await recarregarConexao({ force: true });
            toast({ title: "Instagram conectado" });
          } finally {
            setBusy(false);
          }
        })();
      } else if (tipo === IG_OAUTH_ERROR) {
        toast({
          title: "Não foi possível conectar",
          description:
            typeof event.data?.message === "string" ? event.data.message : "Tente novamente.",
          variant: "destructive",
        });
        setBusy(false);
      }
    };
    window.addEventListener("message", aoReceber);
    return () => window.removeEventListener("message", aoReceber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!planLoaded) return;
    void (async () => {
      if (!isDemo) await carregar();
      setLoading(false);
    })();
  }, [planLoaded, isDemo]);

  const conectar = async () => {
    setBusy(true);
    try {
      const url = await getInstagramAuthUrl(redirectUri);
      const popup = window.open(url, "instagram_oauth", POPUP_FEATURES);
      if (!popup) {
        window.location.href = url; // popup bloqueado
        return;
      }
      const timer = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(timer);
          setBusy(false);
        }
      }, 500);
    } catch (e) {
      toast({
        title: "Erro ao iniciar a conexão",
        description: (e as Error).message,
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  const reassinarWebhook = async () => {
    setBusy(true);
    try {
      const atualizada = await subscribeInstagramWebhook();
      setConexao(atualizada);
      toast(
        atualizada.webhook_subscrito
          ? { title: "Pronto — o Instagram já vai avisar dos comentários" }
          : {
              title: "Ainda não deu",
              description: atualizada.webhook_erro || "Tente novamente em alguns instantes.",
              variant: "destructive",
            },
      );
    } catch (e) {
      toast({
        title: "Não foi possível ativar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const desconectar = async () => {
    setBusy(true);
    try {
      await disconnectInstagram();
      setConexao(null);
      await recarregarConexao({ force: true });
      toast({ title: "Instagram desconectado" });
    } catch (e) {
      toast({
        title: "Erro ao desconectar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      setDesconectarAberto(false);
    }
  };

  if (!planLoaded || loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
      </div>
    );
  }

  if (isDemo) {
    return (
      <div className="space-y-4">
        <Badge className="gap-1 border-amber-500/25 bg-amber-500/10 text-amber-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> Conectado · dados demonstrativos
        </Badge>
        <p className="text-sm text-muted-foreground">
          Esta conta usa dados demonstrativos. Nenhum Instagram real está conectado.
        </p>
      </div>
    );
  }

  // Estado: nunca conectou
  if (!conexao) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Antes de conectar, confira estes três passos no app do Instagram:
        </p>
        <Checklist />
        <div className="space-y-2">
          {/* Público de mentoria trava em tela de senha. Dizer de quem é a tela e
              o que a gente NÃO vê resolve a hesitação antes de ela acontecer. */}
          <p className="text-xs text-muted-foreground">
            O login acontece no site do próprio Instagram. O MarketDash não vê e não
            guarda sua senha — mesmo que você já esteja logada, ele vai pedir para você
            entrar de novo, para garantir que a conta conectada é a certa.
          </p>
          <Button onClick={conectar} disabled={busy} className="w-full md:w-auto">
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Instagram className="mr-2 h-4 w-4" />
            )}
            Conectar Instagram
          </Button>
        </div>
      </div>
    );
  }

  const expirado = conexao.status !== "ativo";

  return (
    <div className="space-y-5">
      {expirado ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-amber-400">
              {conexao.status === "revogado"
                ? "Você removeu o MarketDash no Instagram."
                : "Sua conexão expirou."}
            </p>
            <p className="text-xs text-muted-foreground">
              Suas automações foram pausadas e nada está sendo enviado. Reconecte para voltar a
              funcionar — as automações continuam salvas.
            </p>
          </div>
        </div>
      ) : !conexao.webhook_subscrito ? (
        // Este é o silêncio mais caro da integração: tudo parece certo — conectado,
        // automação ativa — e nenhum direct sai, porque a CONTA não foi inscrita no
        // webhook. A Meta não reporta erro. Então a tela precisa gritar.
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-amber-400">
              Conectado, mas ainda não estamos recebendo os comentários.
            </p>
            <p className="text-xs text-muted-foreground">
              Enquanto isso não for resolvido, nenhuma automação dispara. As causas mais
              comuns são o perfil estar <strong>privado</strong> (precisa ser público) ou a
              opção <strong>Permitir acesso às mensagens</strong> ter sido desligada no
              Instagram. Ajuste e tente de novo.
            </p>
            {conexao.webhook_erro && (
              <p className="font-mono text-[11px] text-muted-foreground">{conexao.webhook_erro}</p>
            )}
            <Button size="sm" onClick={() => void reassinarWebhook()} disabled={busy}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Tentar de novo
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {conexao.ig_avatar_url ? (
            <img
              src={conexao.ig_avatar_url}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/10">
              <Instagram className="h-5 w-5 text-pink-500" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              @{conexao.ig_username || conexao.ig_user_id}
            </span>
            <span className="block text-xs text-muted-foreground">
              Conectado desde {formatarData(conexao.connected_at)}
            </span>
          </span>
          <Badge className="gap-1 border-emerald-500/25 bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
          </Badge>
        </div>
      )}

      {!conexao.pode_responder_comentario && (
        // Conectou sem a permissão de comentários: o direct sai, a resposta
        // pública não. Sem este aviso, a aluna configura as variações, publica, e
        // só percebe que nada aparece embaixo do comentário depois.
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-amber-400">
              Falta a permissão de comentários.
            </p>
            <p className="text-xs text-muted-foreground">
              O direct vai continuar sendo enviado, mas não conseguimos responder
              publicamente embaixo do comentário. Reconecte e mantenha todas as opções
              marcadas na tela do Instagram.
            </p>
          </div>
        </div>
      )}

      {conexao.account_type === "MEDIA_CREATOR" && conexao.webhook_subscrito && (
        // Preventivo, não bloqueia: conta Business não consegue ficar privada, mas
        // Criador consegue — e perfil privado deixa de receber comentário sem avisar.
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Sua conta é do tipo <strong>Criador de Conteúdo</strong>. Se em algum momento
          você deixar o perfil privado, o Instagram para de nos avisar dos comentários e
          a automação silencia — sem mensagem de erro. Mantenha o perfil público.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {expirado && (
          <Button onClick={conectar} disabled={busy} className="w-full sm:w-auto">
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Instagram className="mr-2 h-4 w-4" />
            )}
            Reconectar
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 sm:w-auto"
          onClick={() => setDesconectarAberto(true)}
          disabled={busy}
        >
          <Unplug className="mr-2 h-4 w-4" /> Desconectar
        </Button>
        <Button variant="ghost" className="w-full sm:w-auto" asChild>
          <a
            href="https://www.instagram.com/accounts/manage_access/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Gerenciar no Instagram <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>

      <AlertDialog open={desconectarAberto} onOpenChange={setDesconectarAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar o Instagram?</AlertDialogTitle>
            <AlertDialogDescription>
              Suas automações e o histórico de envios serão removidos junto com a conexão. Suas
              campanhas e comissões não são afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={desconectar} disabled={busy}>
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
