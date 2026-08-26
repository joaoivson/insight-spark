import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Loader2, Plus, Send, X } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { EnvioRapidoModal } from "@/components/whatsapp/EnvioRapidoModal";
import { AnunciosDaCampanha } from "@/features/dashboard/components/AnunciosDaCampanha";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { StatusCampanhaBadge } from "@/features/dashboard/pages/CampanhasGrupos";
import {
  atualizarCampanha,
  definirGruposDaCampanha,
  obterCampanha,
  type CampanhaGruposDetalhe,
  type EstrategiaEntrada,
  type StatusCampanha,
} from "@/services/campanhas_grupos.service";
import { cn } from "@/shared/lib/utils";
import { useWhatsappConexoesStore } from "@/stores/whatsappConexoesStore";

/** Opção de rádio como cartão clicável — mesmo padrão do AutomacaoEditor. */
const Opcao = ({
  titulo,
  descricao,
  ativo,
  onClick,
}: {
  titulo: string;
  descricao: string;
  ativo: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    role="radio"
    aria-checked={ativo}
    className={cn(
      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
      ativo ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40",
    )}
  >
    <span
      className={cn(
        "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2",
        ativo ? "border-primary" : "border-muted-foreground/40",
      )}
    >
      {ativo && <span className="h-2 w-2 rounded-full bg-primary" />}
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-medium text-foreground">{titulo}</span>
      <span className="block text-xs text-muted-foreground">{descricao}</span>
    </span>
  </button>
);

const BadgeEnvioOk = () => (
  <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500">Envio ok</Badge>
);

type FormCampanha = {
  nome: string;
  descricao: string;
  status: StatusCampanha;
  estrategia_entrada: EstrategiaEntrada;
  abertura_automatica: boolean;
  reabertura_automatica: boolean;
};

/** Linha da aba Grupos, mantida localmente até o "Salvar ordem". */
type VinculoLocal = {
  grupo_id: number;
  aberto: boolean;
  nome: string;
  participantes: number;
  permite_envio: boolean;
};

const paraVinculos = (detalhe: CampanhaGruposDetalhe): VinculoLocal[] =>
  [...detalhe.grupos]
    .sort((a, b) => a.posicao - b.posicao)
    .map((g) => ({
      grupo_id: g.grupo_id,
      aberto: g.aberto,
      nome: g.nome ?? "(grupo sem nome)",
      participantes: g.participantes,
      permite_envio: g.permite_envio,
    }));

/** Assinatura de ordem+aberto — é o que o PUT persiste, então é o que define "sujo". */
const assinatura = (vinculos: VinculoLocal[]) =>
  vinculos.map((v) => `${v.grupo_id}:${v.aberto ? 1 : 0}`).join(",");

/** Abas válidas em ?tab= — voltar do editor de roteiro cai direto na aba certa. */
const ABAS = [
  "visao-geral",
  "grupos",
  "roteiros",
  "link",
  "atividade",
  "anuncios",
  "resultados",
  "monitoramento",
] as const;

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

  const [form, setForm] = useState<FormCampanha | null>(null);
  const [salvandoForm, setSalvandoForm] = useState(false);

  const [vinculos, setVinculos] = useState<VinculoLocal[]>([]);
  const [baseline, setBaseline] = useState("");
  const [salvandoGrupos, setSalvandoGrupos] = useState(false);

  const [modalAdicionar, setModalAdicionar] = useState(false);
  const [modalEnvio, setModalEnvio] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  // Pré-seleção do envio rápido: os grupos abertos da campanha.
  const gruposAbertos = useMemo(
    () => vinculos.filter((v) => v.aberto).map((v) => v.grupo_id),
    [vinculos],
  );

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
      setForm({
        nome: d.nome,
        descricao: d.descricao ?? "",
        status: d.status,
        estrategia_entrada: d.estrategia_entrada,
        abertura_automatica: d.abertura_automatica,
        reabertura_automatica: d.reabertura_automatica,
      });
      aplicarGrupos(d);
    } catch (e) {
      setErro((e as Error).message);
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

  // ── Visão geral ───────────────────────────────────────────────────────────
  const salvarForm = async () => {
    if (!form || !form.nome.trim()) return;
    setSalvandoForm(true);
    try {
      const atualizada = await atualizarCampanha(campanhaId, {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        status: form.status,
        estrategia_entrada: form.estrategia_entrada,
        abertura_automatica: form.abertura_automatica,
        reabertura_automatica: form.reabertura_automatica,
      });
      setDetalhe((atual) => (atual ? { ...atual, ...atualizada, grupos: atual.grupos } : atual));
      toast({ title: "Campanha salva" });
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSalvandoForm(false);
    }
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

  const removerVinculo = (indice: number) => {
    setVinculos((atual) => atual.filter((_, i) => i !== indice));
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
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSalvandoGrupos(false);
    }
  };

  const gruposDisponiveis = useMemo(() => {
    const vinculados = new Set(vinculos.map((v) => v.grupo_id));
    return gruposSincronizados.filter((g) => !vinculados.has(g.id));
  }, [gruposSincronizados, vinculos]);

  const gruposFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return gruposDisponiveis;
    return gruposDisponiveis.filter((g) => g.nome.toLowerCase().includes(q));
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
        nome: g.nome,
        participantes: g.participantes,
        permite_envio: g.permite_envio,
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

  if (erro || !detalhe || !form) {
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
    <DashboardLayout title={detalhe.nome} action={<StatusCampanhaBadge status={detalhe.status} />}>
      <Tabs value={abaAtiva} onValueChange={trocarAba} className="space-y-5">
        {/* O scroll das abas fica no container, nunca na página. */}
        <div ref={abasRef} className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
            <TabsTrigger value="grupos">
              Grupos
              <span className="ml-1.5 tabular-nums text-muted-foreground">{vinculos.length}</span>
            </TabsTrigger>
            <TabsTrigger value="roteiros">Roteiros</TabsTrigger>
            <TabsTrigger value="link">Link de entrada</TabsTrigger>
            <TabsTrigger value="atividade">Atividade</TabsTrigger>
            <TabsTrigger value="anuncios">Anúncios</TabsTrigger>
            <TabsTrigger value="resultados">Resultados</TabsTrigger>
            <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visao-geral">
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="space-y-2">
                <Label htmlFor="campanha-nome">Nome</Label>
                <Input
                  id="campanha-nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  maxLength={120}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="campanha-descricao">Descrição</Label>
                <Textarea
                  id="campanha-descricao"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  maxLength={2000}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as StatusCampanha })}
                >
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="arquivada">Arquivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2" role="radiogroup" aria-label="Estratégia de entrada">
                <Label>Estratégia de entrada</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Opcao
                    titulo="Sequencial"
                    descricao="Enche o grupo 1; ao lotar, passa ao 2"
                    ativo={form.estrategia_entrada === "sequencial"}
                    onClick={() => setForm({ ...form, estrategia_entrada: "sequencial" })}
                  />
                  <Opcao
                    titulo="Aleatória"
                    descricao="Distribui entre os grupos abertos — compara conversão"
                    ativo={form.estrategia_entrada === "aleatoria"}
                    onClick={() => setForm({ ...form, estrategia_entrada: "aleatoria" })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="abertura-automatica">Abertura automática</Label>
                  <Switch
                    id="abertura-automatica"
                    checked={form.abertura_automatica}
                    onCheckedChange={(v) => setForm({ ...form, abertura_automatica: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="reabertura-automatica">Reabertura automática</Label>
                  <Switch
                    id="reabertura-automatica"
                    checked={form.reabertura_automatica}
                    onCheckedChange={(v) => setForm({ ...form, reabertura_automatica: v })}
                  />
                </div>
              </div>

              <Button
                onClick={() => void salvarForm()}
                disabled={salvandoForm || !form.nome.trim()}
              >
                {salvandoForm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grupos" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setModalEnvio(true)}>
                <Send className="mr-2 h-4 w-4" /> Enviar oferta
              </Button>
              <Button variant="outline" onClick={() => setModalAdicionar(true)}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar grupos
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
                <p className="text-sm text-muted-foreground">Nenhum grupo na campanha ainda.</p>
                <Button variant="outline" onClick={() => setModalAdicionar(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar grupos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop: linhas tabulares */}
              <div className="hidden overflow-hidden rounded-xl border border-border md:block">
                <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="w-6" aria-hidden />
                  <span className="min-w-0 flex-1">Grupo</span>
                  <span className="w-24 text-right">Participantes</span>
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
                    <span className="w-24 flex-shrink-0 text-right text-sm tabular-nums text-foreground">
                      {v.participantes}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={salvandoGrupos}
                        onClick={() => removerVinculo(i)}
                        aria-label={`Remover ${v.nome} da campanha`}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
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
                          <span className="tabular-nums">{v.participantes}</span> participantes
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
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={salvandoGrupos}
                          onClick={() => removerVinculo(i)}
                          aria-label={`Remover ${v.nome} da campanha`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="roteiros">
          <RoteirosDaCampanha campanhaId={campanhaId} />
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
                  : "Todos os grupos sincronizados já estão na campanha."}
              </p>
              {gruposSincronizados.length === 0 && (
                <Button asChild variant="outline">
                  <Link to="/dashboard/configuracoes?tab=numeros">Conectar número</Link>
                </Button>
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
                        aria-label={`Selecionar ${g.nome}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {g.nome}
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

      <EnvioRapidoModal
        open={modalEnvio}
        onOpenChange={setModalEnvio}
        campanhaId={campanhaId}
        gruposPreSelecionados={gruposAbertos}
      />
    </DashboardLayout>
  );
};

export default CampanhaGrupoDetalhe;
