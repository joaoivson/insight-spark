import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Settings,
  ShoppingBag,
  Store,
  Trash2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { MarcaMarketplace } from "@/components/shared/BrandIcons";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { ShopeeApiHelpModal } from "@/features/dashboard/components/ShopeeApiHelpModal";
import { ShopeeIntegrationSettings } from "@/features/dashboard/components/ShopeeIntegrationSettings";
import { useToast } from "@/hooks/use-toast";
import { getShopeeStatus, type ShopeeStatus } from "@/services/shopee.service";
import {
  alternarIntegracao,
  criarIntegracao,
  listarIntegracoes,
  removerIntegracao,
  type Integracao,
  type ProvedorMarketplace,
} from "@/services/ofertas.service";

/** Só marketplace com API de afiliado assinada entra habilitado (espelha PROVEDORES do backend). */
const MARKETPLACES: { valor: string; rotulo: string; disponivel: boolean }[] = [
  { valor: "shopee", rotulo: "Shopee", disponivel: true },
  { valor: "mercado_livre", rotulo: "Mercado Livre", disponivel: false },
  { valor: "amazon", rotulo: "Amazon", disponivel: false },
  { valor: "magalu", rotulo: "Magalu", disponivel: false },
];

const rotuloProvedor = (provedor: string) =>
  MARKETPLACES.find((m) => m.valor === provedor)?.rotulo ?? provedor;

const UM_DIA_MS = 24 * 60 * 60 * 1000;

const formatarSync = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const schema = z.object({
  label: z
    .string()
    .trim()
    .max(64, "No máximo 64 caracteres")
    .optional(),
  app_id: z
    .string()
    .trim()
    .min(1, "App ID é obrigatório")
    .regex(/^\d+$/, "Use o App ID numérico da Shopee (ex.: 18191340007), não o e-mail."),
  senha: z.string().min(1, "Senha é obrigatória"),
});

type FormData = z.infer<typeof schema>;

/** Qual modal do fluxo de adicionar está aberto. */
type PassoAdicionar = "fechado" | "escolher" | "credenciais";

export const MarketplacesSection = () => {
  const { toast } = useToast();

  const [contas, setContas] = useState<Integracao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [alternando, setAlternando] = useState<number | null>(null);
  const [paraRemover, setParaRemover] = useState<Integracao | null>(null);
  const [removendo, setRemovendo] = useState(false);

  const [passo, setPasso] = useState<PassoAdicionar>("fechado");
  const [provedor, setProvedor] = useState<ProvedorMarketplace>("shopee");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);

  /**
   * Status da sincronização de comissões da Shopee.
   *
   * Vem da conexão legada (tabela `shopee_integrations`), que é UMA por
   * usuária — por isso o resumo é do marketplace, não da linha. Fica aqui
   * porque o card precisa dele para o chip de status; a engrenagem abre o
   * componente completo, que refaz a própria consulta.
   */
  const [sync, setSync] = useState<ShopeeStatus | null>(null);
  const [engrenagemAberta, setEngrenagemAberta] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), mode: "onBlur" });

  const carregarSync = useCallback(async () => {
    try {
      setSync(await getShopeeStatus());
    } catch {
      // Chip de status é acessório: se falhar, o card continua utilizável e a
      // engrenagem mostra o estado real.
      setSync(null);
    }
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setContas(await listarIntegracoes());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    void carregarSync();
  }, [carregar, carregarSync]);

  const fecharAdicionar = () => {
    setPasso("fechado");
    reset();
    setMostrarSenha(false);
    setProvedor("shopee");
  };

  /** "principal" na primeira conta; "conta 2", "conta 3"… nas seguintes. */
  const sugestaoDeLabel = () => {
    const doProvedor = contas.filter((c) => c.provedor === provedor);
    if (doProvedor.length === 0) return "principal";
    let n = doProvedor.length + 1;
    const nomes = new Set(doProvedor.map((c) => c.label.toLowerCase()));
    while (nomes.has(`conta ${n}`)) n += 1;
    return `conta ${n}`;
  };

  const onSubmit = async (data: FormData) => {
    setSalvando(true);
    try {
      const label = data.label?.trim() || sugestaoDeLabel();
      const jaExiste = contas.some(
        (c) => c.provedor === provedor && c.label.toLowerCase() === label.toLowerCase()
      );
      if (jaExiste) {
        // O backend faz upsert por (usuária, marketplace, nome): salvar com um
        // nome que já existe TROCA a credencial daquela conta, sem avisar.
        const trocar = window.confirm(
          `Já existe uma conta ${rotuloProvedor(provedor)} chamada "${label}". ` +
          "Salvar vai substituir as credenciais dela. Continuar?"
        );
        if (!trocar) {
          setSalvando(false);
          return;
        }
      }
      const nova = await criarIntegracao({
        provedor,
        label,
        app_id: data.app_id.trim(),
        senha: data.senha,
      });
      setContas((atual) => {
        const semDuplicada = atual.filter((c) => c.id !== nova.id);
        return [...semDuplicada, nova];
      });
      fecharAdicionar();
      void carregarSync();
      toast({ title: "Conta conectada", description: `${rotuloProvedor(nova.provedor)} · ${nova.label}` });
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (conta: Integracao, ativa: boolean) => {
    setAlternando(conta.id);
    try {
      const atualizada = await alternarIntegracao(conta.id, ativa);
      setContas((atual) => atual.map((c) => (c.id === atualizada.id ? atualizada : c)));
    } catch (e) {
      toast({
        title: "Não foi possível alterar a conta",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setAlternando(null);
    }
  };

  const remover = async () => {
    if (!paraRemover) return;
    setRemovendo(true);
    try {
      await removerIntegracao(paraRemover.id);
      setContas((atual) => atual.filter((c) => c.id !== paraRemover.id));
      toast({ title: "Conta removida" });
      setParaRemover(null);
    } catch (e) {
      toast({
        title: "Não foi possível remover",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setRemovendo(false);
    }
  };

  const conectados = new Set(contas.map((c) => c.provedor));
  const syncPausada = !!sync?.sync_paused_at;
  const syncAtrasada =
    !!sync?.last_sync_at && !syncPausada && Date.now() - new Date(sync.last_sync_at).getTime() > UM_DIA_MS;

  /**
   * A engrenagem sai só na PRIMEIRA conta Shopee.
   *
   * A sincronização é uma só por usuária (conexão legada), não uma por conta —
   * repetir a engrenagem em duas linhas Shopee prometeria um ajuste por conta
   * que não existe.
   */
  const idDaEngrenagem = contas.find((c) => c.provedor === "shopee")?.id ?? null;
  /** Sync existe, mas nenhuma linha Shopee para pendurar a engrenagem. */
  const syncOrfa = !!sync && idDaEngrenagem === null;

  const abrirCredenciais = (valor: string) => {
    setProvedor(valor as ProvedorMarketplace);
    setPasso("credenciais");
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div className="flex items-start gap-3 md:gap-4 min-w-0">
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Store className="w-6 h-6 text-orange-500" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground">Contas de marketplace</h3>
              <p className="text-xs text-muted-foreground">
                A busca de ofertas e a conversão de links assinam com a <strong>sua</strong>{" "}
                credencial — é ela que garante a comissão na sua conta.
              </p>
            </div>
          </div>
          <Button
            className="min-h-10 w-full sm:w-auto flex-shrink-0"
            onClick={() => setPasso("escolher")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar conta
          </Button>
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : erro ? (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Não conseguimos carregar suas contas agora.
            </p>
            <Button variant="outline" className="mt-3 min-h-10" onClick={() => void carregar()}>
              Tentar de novo
            </Button>
          </div>
        ) : contas.length === 0 ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <ShoppingBag className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhuma conta conectada. Adicione a sua conta Shopee para buscar ofertas.
              </p>
              <Button variant="outline" className="mt-3 min-h-10" onClick={() => setPasso("escolher")}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar conta
              </Button>
            </div>
            {/* Sync legada sem linha de conta: quem conectou antes da migração de
                tabelas tem `shopee_integrations` e nenhuma `integracoes`. Sem
                esta faixa, "Sincronizar agora" e "Desconectar" ficariam
                inalcançáveis — a engrenagem mora na linha da conta. */}
            {sync && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
                <MarcaMarketplace provedor="shopee" className="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">Shopee — sincronização</p>
                  <p className="text-xs text-muted-foreground">
                    {syncPausada
                      ? "Reconexão necessária"
                      : sync.last_sync_at
                        ? `Última sync: ${formatarSync(sync.last_sync_at)}`
                        : "Ainda não sincronizou"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="min-h-10 w-10 p-0 flex-shrink-0"
                  onClick={() => setEngrenagemAberta(true)}
                  aria-label="Ajustes de sincronização da Shopee"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ul className="space-y-3" role="list">
            {syncOrfa && (
              <li className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
                <MarcaMarketplace provedor="shopee" className="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">Shopee — sincronização</p>
                  <p className="text-xs text-muted-foreground">
                    {syncPausada
                      ? "Reconexão necessária"
                      : sync?.last_sync_at
                        ? `Última sync: ${formatarSync(sync.last_sync_at)}`
                        : "Ainda não sincronizou"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="min-h-10 w-10 p-0 flex-shrink-0"
                  onClick={() => setEngrenagemAberta(true)}
                  aria-label="Ajustes de sincronização da Shopee"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </li>
            )}
            {contas.map((conta) => (
              <li
                key={conta.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center"
              >
                <MarcaMarketplace provedor={conta.provedor} className="h-11 w-11" />

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {rotuloProvedor(conta.provedor)}
                    </span>
                    {conta.label.toLowerCase() !== "principal" && (
                      <Badge variant="secondary">{conta.label}</Badge>
                    )}
                    {!conta.ativa && (
                      <Badge variant="outline" className="text-muted-foreground">
                        inativa
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    App ID <span className="font-mono text-foreground">{conta.app_id_mascarado}</span>
                  </p>

                  {/* Resumo da sincronização: o que ela precisa ver sem abrir
                      nada. O ajuste fino mora na engrenagem. */}
                  {conta.id === idDaEngrenagem && sync && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {syncPausada ? (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Reconexão necessária
                        </Badge>
                      ) : sync.last_sync_at ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              syncAtrasada ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                          Última sync: {formatarSync(sync.last_sync_at)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Ainda não sincronizou</span>
                      )}
                      {syncAtrasada && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          sync atrasada
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 sm:gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    {alternando === conta.id && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      checked={conta.ativa}
                      disabled={alternando === conta.id}
                      onCheckedChange={(v) => void alternar(conta, v)}
                      aria-label={`${conta.ativa ? "Desativar" : "Ativar"} a conta ${conta.label}`}
                    />
                  </div>
                  {conta.id === idDaEngrenagem && (
                    <Button
                      variant="ghost"
                      className="min-h-10 w-10 p-0 relative"
                      onClick={() => setEngrenagemAberta(true)}
                      aria-label="Ajustes de sincronização da Shopee"
                    >
                      <Settings className="h-4 w-4" />
                      {/* Ponto âmbar: a pendência precisa ser visível com a
                          engrenagem fechada, senão ninguém abre. */}
                      {(syncPausada || syncAtrasada) && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="min-h-10 w-10 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setParaRemover(conta)}
                    aria-label={`Remover a conta ${conta.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Engrenagem: sincronização de comissões.
          Era um segundo card do mesmo tamanho do de contas, para uma conta só —
          e a credencial dele aponta para a MESMA conta Shopee de cima (o backend
          grava nas duas durante a migração de tabelas), então a tela repetia
          AppID e senha em dois lugares. */}
      <ResponsiveModal
        open={engrenagemAberta}
        onOpenChange={(aberto) => {
          setEngrenagemAberta(aberto);
          // Alterar credencial ou sincronizar lá dentro muda o chip da linha.
          if (!aberto) void carregarSync();
        }}
        title="Sincronização de comissões — Shopee"
        description="De hora em hora (últimos 7 dias) e um reconcile completo na madrugada. Cliques continuam vindo do Upload Cliques."
        contentClassName="sm:max-w-2xl"
      >
        <div className="pb-2 max-h-[70vh] overflow-y-auto">
          <ShopeeIntegrationSettings />
        </div>
      </ResponsiveModal>

      {/* Passo 1 — escolher o marketplace */}
      <ResponsiveModal
        open={passo === "escolher"}
        onOpenChange={(aberto) => !aberto && fecharAdicionar()}
        title="Adicionar conta"
        description="Escolha o marketplace que você quer conectar."
      >
        <div className="grid grid-cols-2 gap-3 pb-2">
          {MARKETPLACES.map((m) => {
            const conectado = conectados.has(m.valor);
            return (
              <button
                key={m.valor}
                type="button"
                disabled={!m.disponivel}
                onClick={() => abrirCredenciais(m.valor)}
                className="relative flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 p-4 text-center transition-colors hover:border-primary/50 hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-muted/30"
              >
                {conectado && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15">
                    <Check className="h-3 w-3 text-emerald-500" />
                  </span>
                )}
                <MarcaMarketplace provedor={m.valor} className="h-12 w-12" />
                <span className="text-sm font-medium text-foreground">{m.rotulo}</span>
                <span className="text-xs text-muted-foreground">
                  {!m.disponivel ? "em breve" : conectado ? "conectado" : "conectar"}
                </span>
              </button>
            );
          })}
        </div>
      </ResponsiveModal>

      {/* Passo 2 — credenciais */}
      <ResponsiveModal
        open={passo === "credenciais"}
        onOpenChange={(aberto) => !aberto && fecharAdicionar()}
        title={`Conectar ${rotuloProvedor(provedor)}`}
        description="As credenciais ficam cifradas e só são usadas para assinar suas próprias buscas e links."
      >
        <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-4 pb-2">
          <button
            type="button"
            onClick={() => setPasso("escolher")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Trocar de marketplace
          </button>

          <div className="space-y-2">
            <Label htmlFor="conta-label">Nome da conta</Label>
            <Input
              id="conta-label"
              placeholder="Opcional — ex.: conta 2"
              maxLength={64}
              {...register("label")}
            />
            <p className="text-xs text-muted-foreground">
              É por esse nome que você escolhe a conta quando tem mais de uma.
            </p>
            {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shopee-open-api-id">App ID</Label>
            <Input
              id="shopee-open-api-id"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ex.: 18191340007"
              {...register("app_id")}
            />
            {errors.app_id && <p className="text-sm text-destructive">{errors.app_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shopee-open-api-key">Senha / Secret</Label>
            <div className="relative">
              <Input
                id="shopee-open-api-key"
                type={mostrarSenha ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Senha da API"
                className="pr-10"
                {...register("senha")}
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.senha && <p className="text-sm text-destructive">{errors.senha.message}</p>}
            {provedor === "shopee" && (
              <ShopeeApiHelpModal
                trigger={
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Não sei onde pegar / não tenho ainda
                  </button>
                }
              />
            )}
          </div>

          <Button type="submit" className="w-full min-h-10" disabled={salvando}>
            {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar conta
          </Button>
        </form>
      </ResponsiveModal>

      <AlertDialog open={paraRemover !== null} onOpenChange={(o) => !o && setParaRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover a conta {paraRemover?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              As credenciais salvas são apagadas. Buscas e conversões de link que dependem dessa
              conta param de funcionar até você conectar de novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={removendo}
              onClick={(e) => {
                e.preventDefault();
                if (removendo) return;
                void remover();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removendo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
