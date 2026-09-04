import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowDown, ArrowUp, Download, Loader2, MoreVertical, Plus, Settings2, Trash2,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { AnunciosDaCampanha } from "@/features/dashboard/components/AnunciosDaCampanha";
import { ConfiguracoesDaCampanha } from "@/features/dashboard/components/ConfiguracoesDaCampanha";
import { ExportarLeadsModal } from "@/features/dashboard/components/ExportarLeadsModal";
import { NumerosDaCampanha } from "@/features/dashboard/components/NumerosDaCampanha";
import { VisaoGeralDaCampanha } from "@/features/dashboard/components/VisaoGeralDaCampanha";
import { AtividadeDaCampanha } from "@/features/dashboard/components/AtividadeDaCampanha";
import { LinkDeEntradaDaCampanha } from "@/features/dashboard/components/LinkDeEntradaDaCampanha";
import { ResultadosDaCampanha } from "@/features/dashboard/components/ResultadosDaCampanha";
import { MonitoramentoDaCampanha } from "@/features/dashboard/components/MonitoramentoDaCampanha";
import { RoteirosDaCampanha } from "@/features/dashboard/components/RoteirosDaCampanha";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { StatusCampanhaBadge } from "@/features/dashboard/pages/CampanhasGrupos";
import {
  definirGruposDaCampanha,
  obterCampanha,
  type CampanhaGrupos,
  type CampanhaGruposDetalhe,
} from "@/services/campanhas_grupos.service";
import { cn } from "@/shared/lib/utils";
import { mensagemAmigavel } from "@/services/http-error";
import { useWhatsappConexoesStore } from "@/stores/whatsappConexoesStore";
import { rotuloDoGrupo } from "@/shared/lib/grupo";

const BadgeEnvioOk = () => (
  <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500">Envio ok</Badge>
);

/** Linha da aba Grupos, mantida localmente até o "Salvar ordem". */
type VinculoLocal = {
  grupo_id: number;
  aberto: boolean;
  nome: string;
  participantes: number;
  capacidade: number;
  permite_envio: boolean;
  instancia_ids: number[];
};

const paraVinculos = (detalhe: CampanhaGruposDetalhe): VinculoLocal[] =>
  [...detalhe.grupos]
    .sort((a, b) => a.posicao - b.posicao)
    .map((g) => ({
      grupo_id: g.grupo_id,
      aberto: g.aberto,
      nome: g.nome ?? "(grupo sem nome)",
      participantes: g.participantes,
      capacidade: g.capacidade,
      permite_envio: g.permite_envio,
      instancia_ids: g.instancia_ids ?? [],
    }));

/** Assinatura de ordem+aberto — é o que o PUT persiste, então é o que define "sujo". */
const assinatura = (vinculos: VinculoLocal[]) =>
  vinculos.map((v) => `${v.grupo_id}:${v.aberto ? 1 : 0}`).join(",");

/** Abas válidas em ?tab= — voltar do editor de roteiro cai direto na aba certa. */
const ABAS = [
  "visao-geral",
  "numeros",
  "grupos",
  "roteiros",
  "link",
  "anuncios",
  "resultados",
  "atividade",
  "monitoramento",
] as const;

/**
 * Ocupação do grupo: quanto falta para ele sair da rotação de entrada.
 *
 * O teto é o MENOR entre a capacidade do WhatsApp e o limite da campanha — a
 * mesma regra que o backend usa para escolher o grupo. Mostrar só a capacidade
 * diria "há vaga" num grupo que o roteador já não escolhe.
 */
const tetoDoGrupo = (capacidade: number, limite: number | null) =>
  limite ? Math.min(capacidade, limite) : capacidade;

const CampanhaGrupoDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const campanhaId = Number(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const abaDaUrl = searchParams.get("tab");
  const abaAtiva = ABAS.includes(abaDaUrl as (typeof ABAS)[number])
    ? (abaDaUrl as string)
    : "visao-geral";

  // Abas controladas pela URL: com `defaultValue` a aba só era lida na montagem,
  // então trocar `?tab=` (link de outra tela, ação de estado vazio) não mudava
  // nada na tela. `replace` para não encher o histórico com cada clique de aba.
  const trocarAba = useCallback(
    (aba: string) => {
      const proximo = new URLSearchParams(searchParams);
      proximo.set("tab", aba);
      setSearchParams(proximo, { replace: true });
    },
    [searchParams, setSearchParams],
  );
  const { toast } = useToast();
  const { grupos: gruposSincronizados, fetch: fetchConexoes } = useWhatsappConexoesStore();

  const [detalhe, setDetalhe] = useState<CampanhaGruposDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalConfig, setModalConfig] = useState(false);
  const [modalExport, setModalExport] = useState(false);
  /** Grupo pendente de confirmação de remoção (spec §3.2). */
  const [removendo, setRemovendo] = useState<VinculoLocal | null>(null);

  const [vinculos, setVinculos] = useState<VinculoLocal[]>([]);
  const [baseline, setBaseline] = useState("");
  const [salvandoGrupos, setSalvandoGrupos] = useState(false);

  const [modalAdicionar, setModalAdicionar] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  const aplicarGrupos = useCallback((d: CampanhaGruposDetalhe) => {
    const lista = paraVinculos(d);
    setVinculos(lista);
    setBaseline(assinatura(lista));
  }, []);

  const carregar = useCallback(async () => {
    if (!Number.isInteger(campanhaId) || campanhaId <= 0) {
      setErro("Campanha não encontrada.");
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const d = await obterCampanha(campanhaId);
      setDetalhe(d);
      aplicarGrupos(d);
    } catch (e) {
      // `mensagemAmigavel` e não `.message`: com o backend reiniciando, o
      // proxy devolve HTML e a tela exibiria o HTML cru como estado de erro.
      setErro(mensagemAmigavel(e, "Não foi possível carregar a campanha."));
    } finally {
      setCarregando(false);
    }
  }, [campanhaId, aplicarGrupos]);

  useEffect(() => {
    void carregar();
    void fetchConexoes();
  }, [carregar, fetchConexoes]);

  // Sete abas não cabem em 390px. Sem isto, quem chega por `?tab=resultados`
  // cai numa lista rolada até o começo e não vê qual aba está ativa.
  const abasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (carregando) return;
    abasRef.current
      ?.querySelector('[data-state="active"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [carregando, abaAtiva]);

  // ── Configurações ─────────────────────────────────────────────────────────
  const aoSalvarConfig = (atualizada: CampanhaGrupos) => {
    setDetalhe((atual) => (atual ? { ...atual, ...atualizada } : atual));
  };

  // ── Grupos ────────────────────────────────────────────────────────────────
  const gruposDirty = assinatura(vinculos) !== baseline;

  const mover = (indice: number, delta: -1 | 1) => {
    setVinculos((atual) => {
      const destino = indice + delta;
      if (destino < 0 || destino >= atual.length) return atual;
      const copia = [...atual];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  };

  const alternarAberto = (indice: number) => {
    setVinculos((atual) =>
      atual.map((v, i) => (i === indice ? { ...v, aberto: !v.aberto } : v)),
    );
  };

  /**
   * Só tira da lista local — o "Salvar ordem" é que persiste.
   *
   * O grupo continua ativo em Configurações › WhatsApp › Números e nas outras
   * campanhas: um grupo pode estar em várias, e sair de uma nunca afeta as
   * demais (spec §3.2).
   */
  const removerVinculo = (grupoId: number) => {
    setVinculos((atual) => atual.filter((v) => v.grupo_id !== grupoId));
    setRemovendo(null);
  };

  const salvarGrupos = async () => {
    setSalvandoGrupos(true);
    try {
      const atualizado = await definirGruposDaCampanha(
        campanhaId,
        vinculos.map((v, i) => ({ grupo_id: v.grupo_id, posicao: i, aberto: v.aberto })),
      );
      setDetalhe((atual) =>
        atual ? { ...atual, grupos: atualizado.grupos, total_grupos: atualizado.total_grupos } : atualizado,
      );
      aplicarGrupos(atualizado);
      toast({ title: "Grupos salvos" });
    } catch (e) {
      toast({
        title: "Não foi possível salvar os grupos",
        description: mensagemAmigavel(e, "Tente novamente."),
        variant: "destructive",
      });
    } finally {
      setSalvandoGrupos(false);
    }
  };

  /** Números que esta campanha usa. Vazio = ainda não configurou a aba Números. */
  const numerosDaCampanha = useMemo(
    () => new Set(detalhe?.instancia_ids ?? []),
    [detalhe],
  );

  // §6.3: a campanha só oferece grupos ATIVADOS pela usuária. Grupos já
  // vinculados continuam visíveis na lista da campanha — só saem da oferta.
  //
  // §2.3: e só grupos dos NÚMEROS da campanha. Sem isso a lista oferecia grupos
  // de qualquer número conectado, e um grupo do número A numa campanha que
  // dispara pelo B faz o envio falhar em silêncio.
  const gruposDisponiveis = useMemo(() => {
    const vinculados = new Set(vinculos.map((v) => v.grupo_id));
    return gruposSincronizados.filter(
      (g) =>
        g.ativado &&
        !vinculados.has(g.id) &&
        (numerosDaCampanha.size === 0 ||
          (g.instancia_ids ?? []).some((id) => numerosDaCampanha.has(id))),
    );
  }, [gruposSincronizados, vinculos, numerosDaCampanha]);

  const temGrupoAtivado = useMemo(
    () => gruposSincronizados.some((g) => g.ativado),
    [gruposSincronizados],
  );

  const gruposFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return gruposDisponiveis;
    return gruposDisponiveis.filter((g) => rotuloDoGrupo(g.nome, g.id).toLowerCase().includes(q));
  }, [gruposDisponiveis, busca]);

  const alternarSelecionado = (grupoId: number) => {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(grupoId)) proximo.delete(grupoId);
      else proximo.add(grupoId);
      return proximo;
    });
  };

  const adicionarSelecionados = () => {
    const novos = gruposDisponiveis
      .filter((g) => selecionados.has(g.id))
      .map((g) => ({
        grupo_id: g.id,
        aberto: true,
        nome: rotuloDoGrupo(g.nome, g.id),
        participantes: g.participantes,
        capacidade: g.capacidade,
        permite_envio: g.permite_envio,
        instancia_ids: g.instancia_ids ?? [],
      }));
    setVinculos((atual) => [...atual, ...novos]);
    setModalAdicionar(false);
    setBusca("");
    setSelecionados(new Set());
  };

  // ── Estados de página ─────────────────────────────────────────────────────
  if (carregando) {
    return (
      <DashboardLayout title="Campanha">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (erro || !detalhe) {
    return (
      <DashboardLayout title="Campanha">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {erro ?? "Não foi possível carregar a campanha."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => void carregar()}>
                Tentar novamente
              </Button>
              <Button asChild variant="ghost">
                <Link to="/dashboard/grupos">Voltar para Campanhas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={detalhe.nome}
      action={
        <div className="flex items-center gap-2">
          <StatusCampanhaBadge status={detalhe.status} />
          <Button variant="outline" size="sm" onClick={() => setModalConfig(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Configurações
          </Button>
        </div>
      }
    >
      <Tabs value={abaAtiva} onValueChange={trocarAba} className="space-y-5">
        {/* O scroll das abas fica no container, nunca na página. */}
        <div ref={abasRef} className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
            <TabsTrigger value="numeros">Números</TabsTrigger>
            <TabsTrigger value="grupos">
              Grupos
              <span className="ml-1.5 tabular-nums text-muted-foreground">{vinculos.length}</span>
            </TabsTrigger>
            <TabsTrigger value="roteiros">Roteiros</TabsTrigger>
            <TabsTrigger value="link">Link de entrada</TabsTrigger>
            <TabsTrigger value="anuncios">Anúncios</TabsTrigger>
            <TabsTrigger value="resultados">Resultados</TabsTrigger>
            <TabsTrigger value="atividade">Atividade</TabsTrigger>
            <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visao-geral">
          <VisaoGeralDaCampanha campanhaId={campanhaId} />
        </TabsContent>

        <TabsContent value="numeros">
          {/*
            Recarregar só quando a aba Grupos NÃO tem rascunho: `carregar()`
            reescreve `vinculos` a partir do banco, e a afiliada que reordenou
            (badge "Alterações não salvas" aceso) perdia a ordem sem aviso ao
            salvar os números. Com rascunho aberto, a lista de grupos continua
            como está — o escopo novo passa a valer no próximo carregamento.
          */}
          <NumerosDaCampanha
            campanhaId={campanhaId}
            onSalvo={() => {
              if (!gruposDirty) void carregar();
            }}
          />
        </TabsContent>

        <TabsContent value="grupos" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setModalAdicionar(true)}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar grupos
              </Button>
              <Button
                variant="outline"
                onClick={() => setModalExport(true)}
                disabled={vinculos.length === 0}
              >
                <Download className="mr-2 h-4 w-4" /> Exportar leads
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {gruposDirty && (
                <span className="text-xs text-amber-500">Alterações não salvas</span>
              )}
              <Button
                onClick={() => void salvarGrupos()}
                disabled={!gruposDirty || salvandoGrupos}
              >
                {salvandoGrupos && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar ordem
              </Button>
            </div>
          </div>

          {vinculos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                {numerosDaCampanha.size === 0 ? (
                  <>
                    {/* Lista vazia sem motivo é lida como bug. Diz o que falta. */}
                    <p className="max-w-md text-sm text-muted-foreground">
                      Escolha primeiro por quais números esta campanha envia — os grupos
                      disponíveis vêm deles.
                    </p>
                    <Button variant="outline" onClick={() => trocarAba("numeros")}>
                      Ir para Números
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Nenhum grupo na campanha ainda.
                    </p>
                    <Button variant="outline" onClick={() => setModalAdicionar(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Adicionar grupos
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop: linhas tabulares */}
              <div className="hidden overflow-hidden rounded-xl border border-border md:block">
                <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="w-6" aria-hidden />
                  <span className="min-w-0 flex-1">Grupo</span>
                  <span className="w-28 text-right">Ocupação</span>
                  <span className="w-20 text-center">Envio</span>
                  <span className="w-11 text-center">Aberto</span>
                  <span className="w-[120px]" aria-hidden />
                </div>
                {vinculos.map((v, i) => (
                  <div
                    key={v.grupo_id}
                    className={cn("flex items-center gap-3 px-4 py-2", i > 0 && "border-t border-border")}
                  >
                    <span className="w-6 flex-shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {v.nome}
                    </span>
                    <span
                      className={cn(
                        "w-28 flex-shrink-0 text-right text-sm tabular-nums",
                        v.participantes >= tetoDoGrupo(v.capacidade, detalhe.limite_participantes)
                          ? "font-semibold text-amber-500"
                          : "text-foreground",
                      )}
                    >
                      {v.participantes}/{tetoDoGrupo(v.capacidade, detalhe.limite_participantes)}
                    </span>
                    <span className="flex w-20 flex-shrink-0 justify-center">
                      {v.permite_envio ? (
                        <BadgeEnvioOk />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </span>
                    <span className="flex w-11 flex-shrink-0 justify-center">
                      <Switch
                        checked={v.aberto}
                        disabled={salvandoGrupos}
                        onCheckedChange={() => alternarAberto(i)}
                        aria-label={`Grupo ${v.nome} aberto`}
                      />
                    </span>
                    <span className="flex w-[120px] flex-shrink-0 items-center justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={i === 0 || salvandoGrupos}
                        onClick={() => mover(i, -1)}
                        aria-label={`Mover ${v.nome} para cima`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={i === vinculos.length - 1 || salvandoGrupos}
                        onClick={() => mover(i, 1)}
                        aria-label={`Mover ${v.nome} para baixo`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={salvandoGrupos}
                            aria-label={`Ações do grupo ${v.nome}`}
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setRemovendo(v)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover da campanha
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </div>
                ))}
              </div>

              {/* Mobile: cards empilhados, alvos de toque de 40px */}
              <div className="space-y-3 md:hidden">
                {vinculos.map((v, i) => (
                  <div key={v.grupo_id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">
                            {i + 1}.
                          </span>
                          <span className="truncate">{v.nome}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <span
                            className={cn(
                              "tabular-nums",
                              v.participantes >=
                                tetoDoGrupo(v.capacidade, detalhe.limite_participantes) &&
                                "font-semibold text-amber-500",
                            )}
                          >
                            {v.participantes}/
                            {tetoDoGrupo(v.capacidade, detalhe.limite_participantes)}
                          </span>{" "}
                          participantes
                        </p>
                      </div>
                      {v.permite_envio ? (
                        <BadgeEnvioOk />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <Switch
                          checked={v.aberto}
                          disabled={salvandoGrupos}
                          onCheckedChange={() => alternarAberto(i)}
                          aria-label={`Grupo ${v.nome} aberto`}
                        />
                        {v.aberto ? "Aberto" : "Fechado"}
                      </label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={i === 0 || salvandoGrupos}
                          onClick={() => mover(i, -1)}
                          aria-label={`Mover ${v.nome} para cima`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={i === vinculos.length - 1 || salvandoGrupos}
                          onClick={() => mover(i, 1)}
                          aria-label={`Mover ${v.nome} para baixo`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={salvandoGrupos}
                              aria-label={`Ações do grupo ${v.nome}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setRemovendo(v)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover da campanha
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="roteiros">
          <RoteirosDaCampanha
            campanhaId={campanhaId}
            gruposAbertos={vinculos.filter((v) => v.aberto).map((v) => v.grupo_id)}
          />
        </TabsContent>

        <TabsContent value="link" forceMount className="data-[state=inactive]:hidden">
          <LinkDeEntradaDaCampanha campanhaId={campanhaId} />
        </TabsContent>

        <TabsContent value="atividade">
          <AtividadeDaCampanha campanhaId={campanhaId} />
        </TabsContent>

        <TabsContent value="anuncios">
          <AnunciosDaCampanha campanhaId={campanhaId} />
        </TabsContent>

        <TabsContent value="monitoramento">
          <MonitoramentoDaCampanha campanhaId={campanhaId} />
        </TabsContent>

        <TabsContent value="resultados">
          <ResultadosDaCampanha campanhaId={campanhaId} onIrParaAba={trocarAba} />
        </TabsContent>
      </Tabs>

      <ResponsiveModal
        open={modalAdicionar}
        onOpenChange={(o) => {
          setModalAdicionar(o);
          if (!o) {
            setBusca("");
            setSelecionados(new Set());
          }
        }}
        title="Adicionar grupos"
      >
        <div className="space-y-3 pb-2">
          {gruposDisponiveis.length === 0 ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {gruposSincronizados.length === 0
                  ? "Nenhum grupo sincronizado ainda. Conecte um número e sincronize seus grupos."
                  : numerosDaCampanha.size === 0
                    ? "Escolha na aba Números por quais números esta campanha envia."
                    : temGrupoAtivado
                      ? "Todos os grupos ativados destes números já estão na campanha."
                      : "Nenhum grupo ativado ainda. Ative os grupos que vão entrar nas campanhas."}
              </p>
              {gruposSincronizados.length === 0 ? (
                <Button asChild variant="outline">
                  <Link to="/dashboard/configuracoes?tab=numeros">Conectar número</Link>
                </Button>
              ) : (
                !temGrupoAtivado && (
                  <Button asChild variant="outline">
                    <Link to="/dashboard/configuracoes?tab=numeros">Ativar grupos</Link>
                  </Button>
                )
              )}
            </div>
          ) : (
            <>
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar grupo…"
              />
              <div className="max-h-[45vh] space-y-1 overflow-y-auto">
                {gruposFiltrados.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum grupo com esse nome.
                  </p>
                ) : (
                  gruposFiltrados.map((g) => (
                    <label
                      key={g.id}
                      className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/40"
                    >
                      <Checkbox
                        checked={selecionados.has(g.id)}
                        onCheckedChange={() => alternarSelecionado(g.id)}
                        aria-label={`Selecionar ${rotuloDoGrupo(g.nome, g.id)}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {rotuloDoGrupo(g.nome, g.id)}
                      </span>
                      <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">
                        {g.participantes}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <Button
                className="w-full"
                disabled={selecionados.size === 0}
                onClick={adicionarSelecionados}
              >
                {selecionados.size > 0 ? `Adicionar (${selecionados.size})` : "Adicionar"}
              </Button>
            </>
          )}
        </div>
      </ResponsiveModal>

      <ConfiguracoesDaCampanha
        open={modalConfig}
        onOpenChange={setModalConfig}
        campanha={detalhe}
        onSalvo={aoSalvarConfig}
      />

      <ExportarLeadsModal
        open={modalExport}
        onOpenChange={setModalExport}
        campanhaId={campanhaId}
        /*
          `detalhe.grupos` (o que está SALVO), não `vinculos` (o rascunho da
          aba). Grupo adicionado e ainda não salvo não existe para o backend:
          mandá-lo no filtro do CSV devolvia 422 dizendo que ele "não pertence
          a esta campanha" — verdade do ponto de vista do banco, incompreensível
          do ponto de vista de quem acabou de vê-lo na lista.
        */
        grupos={detalhe.grupos.map((g) => ({
          grupo_id: g.grupo_id,
          nome: g.nome ?? `Grupo ${g.grupo_id}`,
        }))}
      />

      {/* §3.2: remover passa por confirmação. O `×` removia direto da lista. */}
      <AlertDialog open={!!removendo} onOpenChange={(o) => !o && setRemovendo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              {removendo?.nome} sai desta campanha. O grupo continua ativo e nas outras
              campanhas em que estiver.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removendo && removerVinculo(removendo.grupo_id)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout>
  );
};

export default CampanhaGrupoDetalhe;
