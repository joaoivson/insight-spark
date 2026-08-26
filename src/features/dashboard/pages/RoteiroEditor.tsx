import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarIcon,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Settings2,
  ShoppingBag,
  Timer,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/services/capture_site.service";
import { obterCampanha, type GrupoDaCampanha } from "@/services/campanhas_grupos.service";
import {
  agendarRoteiro,
  definirPassos,
  obterRoteiro,
  previewRoteiro,
  type AcaoGrupo,
  type PassoIn,
  type PreviewRoteiro,
  type RoteiroDetalhe,
  type TipoConteudo,
} from "@/services/roteiros.service";
import { listarTemplates, type Template } from "@/services/templates.service";
import { cn } from "@/shared/lib/utils";
import { todayKeyBR } from "@/shared/lib/date";

/** Chave estável por passo — o índice muda ao reordenar e o React perderia o foco. */
let sequencia = 0;
const novaChave = () => `passo-${++sequencia}`;

type PassoLocal = PassoIn & { chave: string };

const ATALHOS_OFFSET = [10, 30, 60];

const CONTEUDOS: { valor: TipoConteudo; rotulo: string; Icone: typeof FileText }[] = [
  { valor: "texto", rotulo: "Texto", Icone: FileText },
  { valor: "midia", rotulo: "Imagem", Icone: ImageIcon },
  { valor: "oferta", rotulo: "Oferta", Icone: ShoppingBag },
  { valor: "acao_grupo", rotulo: "Ação no grupo", Icone: Settings2 },
];

const ACOES: { valor: AcaoGrupo; rotulo: string }[] = [
  { valor: "renomear_grupo", rotulo: "Renomear o grupo" },
  { valor: "abrir_entrada", rotulo: "Abrir entrada" },
  { valor: "fechar_entrada", rotulo: "Fechar entrada" },
];

const novoPasso = (): PassoLocal => ({
  chave: novaChave(),
  ordem: 0,
  tipo_tempo: "ancora",
  hora_fixa: "08:00",
  data_fixa: null,
  offset_minutos: null,
  tipo_conteudo: "texto",
  texto: "",
  midia_url: null,
  oferta_url: null,
  template_id: null,
  acao: null,
  acao_parametro: null,
  grupos_alvo: "todos",
  grupos_alvo_ids: null,
  marcar_todos: "nunca",
});

const formatarOffset = (minutos: number) => {
  if (minutos < 60) return `+${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `+${h}h` : `+${h}h${String(m).padStart(2, "0")}`;
};

const formatarDuracao = (segundos: number) => {
  if (segundos < 60) return "menos de 1 min";
  return `~${Math.ceil(segundos / 60)} min`;
};

/** O backend devolve o horário já em Brasília — formatar no fuso do navegador
 *  mostraria outra hora para quem acessa de fora. */
const formatarMomentoBR = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const quandoDoPasso = (p: PassoLocal) => {
  if (p.tipo_tempo === "relativo") return formatarOffset(p.offset_minutos ?? 0);
  const hora = p.hora_fixa || "--:--";
  if (!p.data_fixa) return `${hora} (âncora)`;
  const [, mes, dia] = p.data_fixa.split("-");
  return `${hora} · ${dia}/${mes}`;
};

const resumoDoPasso = (p: PassoLocal, templates: Template[]) => {
  if (p.tipo_conteudo === "texto") return p.texto?.trim() || "Sem texto";
  if (p.tipo_conteudo === "midia") return p.midia_url ? p.texto?.trim() || "Imagem" : "Sem imagem";
  if (p.tipo_conteudo === "oferta") {
    const t = templates.find((x) => x.id === p.template_id);
    const link = p.oferta_url?.trim() || "Sem link";
    return t ? `${link} · ${t.nome}` : link;
  }
  const acao = ACOES.find((a) => a.valor === p.acao)?.rotulo ?? "Ação não escolhida";
  return p.acao === "renomear_grupo" && p.acao_parametro
    ? `${acao}: ${p.acao_parametro}`
    : acao;
};

const paraLocal = (r: RoteiroDetalhe): PassoLocal[] =>
  r.passos.map((p) => ({ ...p, chave: novaChave() }));

/** Assinatura do que o PUT persiste — é o que define "tem alteração não salva". */
const assinatura = (passos: PassoLocal[]) =>
  JSON.stringify(passos.map(({ chave: _chave, ordem: _ordem, ...resto }, i) => ({ ...resto, i })));

/** Botão de rádio compacto — não há radio-group no design system. */
const Radio = ({
  rotulo,
  ativo,
  onClick,
  disabled,
}: {
  rotulo: string;
  ativo: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={ativo}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "min-h-[40px] rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
      ativo
        ? "border-primary bg-primary/5 text-foreground"
        : "border-border text-muted-foreground hover:bg-accent/40",
      disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
    )}
  >
    {rotulo}
  </button>
);

const Bloco = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {titulo}
    </p>
    {children}
  </div>
);

const RoteiroEditor = () => {
  const { campanhaId: campanhaParam, roteiroId: roteiroParam } = useParams();
  const campanhaId = Number(campanhaParam);
  const roteiroId = Number(roteiroParam);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [roteiro, setRoteiro] = useState<RoteiroDetalhe | null>(null);
  const [passos, setPassos] = useState<PassoLocal[]>([]);
  const [baseline, setBaseline] = useState("");
  const [grupos, setGrupos] = useState<GrupoDaCampanha[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [editando, setEditando] = useState<number | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const inputImagemRef = useRef<HTMLInputElement>(null);

  const [dataAncora, setDataAncora] = useState<Date | undefined>(() => {
    const [a, m, d] = todayKeyBR().split("-").map(Number);
    return new Date(a, m - 1, d);
  });
  const [preview, setPreview] = useState<PreviewRoteiro | null>(null);
  const [previewCarregando, setPreviewCarregando] = useState(false);
  const [previewErro, setPreviewErro] = useState<string | null>(null);
  const [agendando, setAgendando] = useState(false);
  const [avisosParaConfirmar, setAvisosParaConfirmar] = useState<string[] | null>(null);

  const voltar = `/dashboard/grupos/${campanhaId}?tab=roteiros`;
  const chaveData = dataAncora ? format(dataAncora, "yyyy-MM-dd") : null;
  const sujo = assinatura(passos) !== baseline;

  const aplicar = useCallback((r: RoteiroDetalhe) => {
    const lista = paraLocal(r);
    setPassos(lista);
    setBaseline(assinatura(lista));
  }, []);

  const carregar = useCallback(async () => {
    if (!Number.isInteger(roteiroId) || roteiroId <= 0) {
      setErro("Roteiro não encontrado.");
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const [r, campanha] = await Promise.all([
        obterRoteiro(roteiroId),
        Number.isInteger(campanhaId) && campanhaId > 0
          ? obterCampanha(campanhaId)
          : Promise.resolve(null),
      ]);
      setRoteiro(r);
      aplicar(r);
      setGrupos(campanha ? [...campanha.grupos].sort((a, b) => a.posicao - b.posicao) : []);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, [roteiroId, campanhaId, aplicar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Templates alimentam o seletor do passo de oferta — falha aqui não derruba a tela.
  useEffect(() => {
    listarTemplates()
      .then((lista) => setTemplates(lista.filter((t) => t.ativo)))
      .catch(() => setTemplates([]));
  }, []);

  // A prévia vem do que está SALVO no backend: com alteração pendente ela
  // mentiria sobre o que vai ser agendado.
  const totalPassos = passos.length;
  useEffect(() => {
    if (!chaveData || sujo || totalPassos === 0) {
      setPreview(null);
      setPreviewErro(null);
      return;
    }
    let cancelado = false;
    setPreviewCarregando(true);
    setPreviewErro(null);
    previewRoteiro(roteiroId, chaveData)
      .then((p) => {
        if (!cancelado) setPreview(p);
      })
      .catch((e: Error) => {
        if (!cancelado) {
          setPreview(null);
          setPreviewErro(e.message);
        }
      })
      .finally(() => {
        if (!cancelado) setPreviewCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [roteiroId, chaveData, sujo, totalPassos]);

  // ── Passos ────────────────────────────────────────────────────────────────
  const alterarPasso = (indice: number, patch: Partial<PassoLocal>) =>
    setPassos((atual) => atual.map((p, i) => (i === indice ? { ...p, ...patch } : p)));

  const mover = (indice: number, delta: -1 | 1) =>
    setPassos((atual) => {
      const destino = indice + delta;
      if (destino < 0 || destino >= atual.length) return atual;
      const copia = [...atual];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });

  const remover = (indice: number) =>
    setPassos((atual) => atual.filter((_, i) => i !== indice));

  const adicionar = () => {
    setPassos((atual) => [...atual, novoPasso()]);
    setEditando(passos.length);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const payload: PassoIn[] = passos.map(({ chave: _chave, ...p }, i) => ({
        ...p,
        ordem: i + 1,
      }));
      const atualizado = await definirPassos(roteiroId, payload);
      setRoteiro(atualizado);
      aplicar(atualizado);
      toast({ title: "Passos salvos" });
    } catch (e) {
      toast({
        title: "Não foi possível salvar os passos",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const aoEscolherImagem = async (e: React.ChangeEvent<HTMLInputElement>, indice: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    try {
      const { url } = await uploadImage(file);
      alterarPasso(indice, { midia_url: url });
    } catch (err) {
      toast({
        title: "Não foi possível enviar a imagem",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
      if (e.target) e.target.value = "";
    }
  };

  // ── Agendar ───────────────────────────────────────────────────────────────
  const executarAgendamento = async (ignorarAvisos: boolean) => {
    if (!chaveData) return;
    setAgendando(true);
    try {
      const resultado = await agendarRoteiro(roteiroId, chaveData, ignorarAvisos);
      if (resultado.agendada === false) {
        setAvisosParaConfirmar(resultado.avisos);
        return;
      }
      setAvisosParaConfirmar(null);
      toast({
        title: "Roteiro agendado",
        description: `${resultado.execucao.total} mensagens na fila.`,
      });
      navigate(voltar);
    } catch (e) {
      toast({
        title: "Não foi possível agendar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setAgendando(false);
    }
  };

  const passoEmEdicao = editando != null ? passos[editando] : undefined;
  const gruposSelecionados = useMemo(
    () => new Set(passoEmEdicao?.grupos_alvo_ids ?? []),
    [passoEmEdicao],
  );

  if (carregando) {
    return (
      <DashboardLayout title="Roteiro">
        <div className="grid gap-6 lg:grid-cols-[62fr_38fr]">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (erro || !roteiro) {
    return (
      <DashboardLayout title="Roteiro">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {erro ?? "Não foi possível carregar o roteiro."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => void carregar()}>
                Tentar novamente
              </Button>
              <Button asChild variant="ghost">
                <Link to={voltar}>Voltar para a campanha</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={roteiro.nome}>
      <div className="mx-auto w-full max-w-[1100px] pb-28">
        {/* min-w-0 nas duas colunas: a trilha `auto` do grid adota o min-content
            do conteúdo e, sem isso, estoura a largura da tela no celular. */}
        <div className="grid gap-6 lg:grid-cols-[62fr_38fr]">
          {/* ── Passos ── */}
          <div className="min-w-0 space-y-3">
            {passos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </span>
                  <p className="text-sm font-medium text-foreground">Nenhum passo ainda</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    O primeiro passo precisa ter hora fixa — os seguintes podem sair alguns
                    minutos depois dele.
                  </p>
                  <Button onClick={adicionar}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar passo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-border">
                  {passos.map((p, i) => {
                    const conteudo = CONTEUDOS.find((c) => c.valor === p.tipo_conteudo);
                    const Icone = conteudo?.Icone ?? FileText;
                    const IconeTempo = p.tipo_tempo === "ancora" ? Clock : Timer;
                    return (
                      <div
                        key={p.chave}
                        className={cn(
                          "flex items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3",
                          i > 0 && "border-t border-border",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setEditando(i)}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-accent/40"
                          aria-label={`Editar passo ${i + 1}`}
                        >
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold tabular-nums text-primary">
                            {i + 1}
                          </span>
                          {/* min-w-0 em CADA nível: sem ele o `truncate` (white-space:
                              nowrap) vira largura mínima e estoura a coluna no celular. */}
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                              <IconeTempo className="h-3.5 w-3.5 flex-shrink-0" />
                              {quandoDoPasso(p)}
                            </span>
                            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                              <Icone className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate">
                                {resumoDoPasso(p, templates)}
                              </span>
                            </span>
                          </span>
                        </button>
                        <span className="flex flex-shrink-0 items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={i === 0}
                            onClick={() => mover(i, -1)}
                            aria-label={`Mover passo ${i + 1} para cima`}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={i === passos.length - 1}
                            onClick={() => mover(i, 1)}
                            aria-label={`Mover passo ${i + 1} para baixo`}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remover(i)}
                            aria-label={`Remover passo ${i + 1}`}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </span>
                      </div>
                    );
                  })}
                </div>
                {passos[0]?.tipo_tempo === "relativo" && (
                  <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    O primeiro passo precisa ter hora fixa — sem ele não há de onde contar os
                    minutos dos demais.
                  </p>
                )}
                <Button variant="outline" onClick={adicionar} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" /> Adicionar passo
                </Button>
              </>
            )}
          </div>

          {/* ── Prévia + agendamento ── */}
          <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <Label>Data-âncora</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataAncora && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataAncora
                          ? format(dataAncora, "dd 'de' MMMM", { locale: ptBR })
                          : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataAncora}
                        onSelect={setDataAncora}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {passos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Adicione ao menos um passo para ver a prévia.
                  </p>
                ) : sujo ? (
                  <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    Salve os passos para a prévia refletir o que vai ser agendado.
                  </p>
                ) : !dataAncora ? (
                  <p className="text-sm text-muted-foreground">
                    Escolha a data-âncora para ver a prévia.
                  </p>
                ) : previewCarregando ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-8 w-full rounded-lg" />
                    ))}
                  </div>
                ) : previewErro ? (
                  <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
                    {previewErro}
                  </p>
                ) : preview ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-lg border border-border">
                      {preview.passos.map((linha, i) => (
                        <div
                          key={linha.ordem}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm",
                            i > 0 && "border-t border-border",
                          )}
                        >
                          <span className="w-5 flex-shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                            {linha.ordem}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-foreground">
                            {formatarMomentoBR(linha.quando)}
                          </span>
                          <span className="flex-shrink-0 text-right tabular-nums text-muted-foreground">
                            {linha.grupos} {linha.grupos === 1 ? "grupo" : "grupos"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Mensagens</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {preview.total_mensagens}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Duração estimada</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatarDuracao(preview.duracao_estimada_s)}
                      </span>
                    </div>

                    {preview.avisos.length > 0 && (
                      <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                          {preview.avisos.length === 1 ? "1 aviso" : `${preview.avisos.length} avisos`}
                        </p>
                        <ul className="list-disc space-y-1 pl-5 text-xs text-amber-500">
                          {preview.avisos.map((aviso) => (
                            <li key={aviso}>{aviso}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}

                <Button
                  className="w-full"
                  disabled={!preview || agendando || salvando}
                  onClick={() => void executarAgendamento(false)}
                >
                  {agendando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agendar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Barra fixa de ações. `md:pl-72` acompanha a largura da sidebar; no
          celular ela sobe acima do bottom nav (z-40, 58px) — no bottom-0 o
          "Salvar passos" ficava escondido atrás da navegação. */}
      <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 backdrop-blur md:bottom-0 md:pl-72">
        <div className="mx-auto flex max-w-[1100px] items-center gap-2 p-3">
          {sujo && (
            <span className="hidden text-xs text-amber-500 sm:mr-auto sm:inline">
              Alterações não salvas
            </span>
          )}
          <Button asChild variant="outline" className="flex-1 sm:flex-none">
            <Link to={voltar}>Voltar</Link>
          </Button>
          <Button
            onClick={() => void salvar()}
            disabled={!sujo || salvando}
            className="flex-1 sm:flex-none"
          >
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar passos
          </Button>
        </div>
      </div>

      {/* ── Edição de um passo ── */}
      <ResponsiveModal
        open={editando != null}
        onOpenChange={(o) => !o && setEditando(null)}
        title={editando != null ? `Passo ${editando + 1}` : "Passo"}
        contentClassName="sm:max-w-xl"
      >
        {passoEmEdicao && editando != null && (
          <div className="space-y-5 pb-2">
            <Bloco titulo="Quando">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Quando">
                <Radio
                  rotulo="Hora fixa"
                  ativo={passoEmEdicao.tipo_tempo === "ancora"}
                  onClick={() =>
                    alterarPasso(editando, {
                      tipo_tempo: "ancora",
                      hora_fixa: passoEmEdicao.hora_fixa || "08:00",
                      offset_minutos: null,
                    })
                  }
                />
                <Radio
                  rotulo="Depois do anterior"
                  disabled={editando === 0}
                  ativo={passoEmEdicao.tipo_tempo === "relativo"}
                  onClick={() =>
                    alterarPasso(editando, {
                      tipo_tempo: "relativo",
                      offset_minutos: passoEmEdicao.offset_minutos ?? 10,
                      hora_fixa: null,
                      data_fixa: null,
                    })
                  }
                />
              </div>

              {passoEmEdicao.tipo_tempo === "ancora" ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="passo-hora" className="text-xs text-muted-foreground">
                      Horário
                    </Label>
                    <Input
                      id="passo-hora"
                      type="time"
                      className="w-32"
                      value={passoEmEdicao.hora_fixa ?? ""}
                      onChange={(e) =>
                        alterarPasso(editando, { hora_fixa: e.target.value || null })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="passo-data" className="text-xs text-muted-foreground">
                      Data própria (opcional)
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id="passo-data"
                        type="date"
                        className="w-40"
                        value={passoEmEdicao.data_fixa ?? ""}
                        onChange={(e) =>
                          alterarPasso(editando, { data_fixa: e.target.value || null })
                        }
                      />
                      {passoEmEdicao.data_fixa && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => alterarPasso(editando, { data_fixa: null })}
                          aria-label="Limpar data própria"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={10080}
                      className="w-28"
                      value={passoEmEdicao.offset_minutos ?? 0}
                      onChange={(e) =>
                        alterarPasso(editando, {
                          offset_minutos: Math.max(
                            0,
                            Math.min(10080, Number(e.target.value) || 0),
                          ),
                        })
                      }
                      aria-label="Minutos depois do passo anterior"
                    />
                    <span className="text-sm text-muted-foreground">
                      minutos depois do passo anterior
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ATALHOS_OFFSET.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => alterarPasso(editando, { offset_minutos: m })}
                        className="min-h-[32px] rounded-full border border-border px-3 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                      >
                        +{m} min
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Bloco>

            <Bloco titulo="O quê">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="O quê">
                {CONTEUDOS.map((c) => (
                  <Radio
                    key={c.valor}
                    rotulo={c.rotulo}
                    ativo={passoEmEdicao.tipo_conteudo === c.valor}
                    onClick={() =>
                      alterarPasso(editando, {
                        tipo_conteudo: c.valor,
                        acao: c.valor === "acao_grupo" ? passoEmEdicao.acao ?? "abrir_entrada" : null,
                      })
                    }
                  />
                ))}
              </div>

              {passoEmEdicao.tipo_conteudo === "texto" && (
                <div className="space-y-1.5">
                  <Textarea
                    value={passoEmEdicao.texto ?? ""}
                    onChange={(e) => alterarPasso(editando, { texto: e.target.value })}
                    maxLength={4000}
                    rows={5}
                    placeholder="Mensagem para os grupos…"
                    aria-label="Texto do passo"
                  />
                  <p className="text-right text-xs tabular-nums text-muted-foreground">
                    {(passoEmEdicao.texto ?? "").length}/4000
                  </p>
                </div>
              )}

              {passoEmEdicao.tipo_conteudo === "midia" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {passoEmEdicao.midia_url && (
                      <div className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                        <img
                          src={passoEmEdicao.midia_url}
                          alt="Imagem do passo"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => alterarPasso(editando, { midia_url: null })}
                          aria-label="Remover imagem"
                          className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <input
                      ref={inputImagemRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void aoEscolherImagem(e, editando)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadLoading}
                      onClick={() => inputImagemRef.current?.click()}
                    >
                      {uploadLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {passoEmEdicao.midia_url ? "Trocar imagem" : "Adicionar imagem"}
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="passo-legenda">Legenda (opcional)</Label>
                    <Textarea
                      id="passo-legenda"
                      value={passoEmEdicao.texto ?? ""}
                      onChange={(e) => alterarPasso(editando, { texto: e.target.value })}
                      maxLength={4000}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {passoEmEdicao.tipo_conteudo === "oferta" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="passo-oferta">Link da oferta</Label>
                    <Input
                      id="passo-oferta"
                      type="url"
                      inputMode="url"
                      placeholder="https://…"
                      value={passoEmEdicao.oferta_url ?? ""}
                      onChange={(e) =>
                        alterarPasso(editando, { oferta_url: e.target.value || null })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Template (opcional)</Label>
                    <Select
                      value={
                        passoEmEdicao.template_id ? String(passoEmEdicao.template_id) : "nenhum"
                      }
                      onValueChange={(v) =>
                        alterarPasso(editando, {
                          template_id: v === "nenhum" ? null : Number(v),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Sem template</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="passo-texto-oferta">Texto (opcional)</Label>
                    <Textarea
                      id="passo-texto-oferta"
                      value={passoEmEdicao.texto ?? ""}
                      onChange={(e) => alterarPasso(editando, { texto: e.target.value })}
                      maxLength={4000}
                      rows={4}
                      placeholder="Use {link} para posicionar o link da oferta."
                    />
                  </div>
                </div>
              )}

              {passoEmEdicao.tipo_conteudo === "acao_grupo" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Ação</Label>
                    <Select
                      value={passoEmEdicao.acao ?? "abrir_entrada"}
                      onValueChange={(v) => alterarPasso(editando, { acao: v as AcaoGrupo })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACOES.map((a) => (
                          <SelectItem key={a.valor} value={a.valor}>
                            {a.rotulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {passoEmEdicao.acao === "renomear_grupo" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="passo-novo-nome">Novo nome do grupo</Label>
                      <Input
                        id="passo-novo-nome"
                        value={passoEmEdicao.acao_parametro ?? ""}
                        onChange={(e) =>
                          alterarPasso(editando, { acao_parametro: e.target.value || null })
                        }
                        maxLength={100}
                      />
                    </div>
                  )}
                </div>
              )}
            </Bloco>

            <Bloco titulo="Para quem">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Para quem">
                <Radio
                  rotulo="Todos os grupos"
                  ativo={passoEmEdicao.grupos_alvo === "todos"}
                  onClick={() =>
                    alterarPasso(editando, { grupos_alvo: "todos", grupos_alvo_ids: null })
                  }
                />
                <Radio
                  rotulo="Escolher grupos"
                  ativo={passoEmEdicao.grupos_alvo === "selecao"}
                  onClick={() => alterarPasso(editando, { grupos_alvo: "selecao" })}
                />
              </div>

              {passoEmEdicao.grupos_alvo === "selecao" &&
                (grupos.length === 0 ? (
                  <div className="space-y-3 rounded-xl border border-border py-6 text-center">
                    <p className="px-4 text-sm text-muted-foreground">
                      Esta campanha ainda não tem grupos.
                    </p>
                    <Button asChild variant="outline">
                      <Link to={`/dashboard/grupos/${campanhaId}?tab=grupos`}>
                        Adicionar grupos
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
                    {grupos.map((g) => (
                      <label
                        key={g.grupo_id}
                        className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/40"
                      >
                        <Checkbox
                          checked={gruposSelecionados.has(g.grupo_id)}
                          onCheckedChange={() => {
                            const proximo = new Set(gruposSelecionados);
                            if (proximo.has(g.grupo_id)) proximo.delete(g.grupo_id);
                            else proximo.add(g.grupo_id);
                            alterarPasso(editando, { grupos_alvo_ids: [...proximo] });
                          }}
                          aria-label={`Selecionar ${g.nome ?? "grupo"}`}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {g.nome ?? "(grupo sem nome)"}
                        </span>
                        <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">
                          {g.participantes}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}

              <div className="flex items-center justify-between gap-3 pt-1">
                <Label htmlFor="passo-marcar-todos">Marcar todos do grupo</Label>
                <Switch
                  id="passo-marcar-todos"
                  checked={passoEmEdicao.marcar_todos === "sempre"}
                  onCheckedChange={(v) =>
                    alterarPasso(editando, { marcar_todos: v ? "sempre" : "nunca" })
                  }
                />
              </div>
              {passoEmEdicao.marcar_todos === "sempre" && (
                <p className="text-xs text-muted-foreground">
                  Todo mundo do grupo recebe notificação desta mensagem.
                </p>
              )}
            </Bloco>

            <Button className="w-full" onClick={() => setEditando(null)}>
              Concluir
            </Button>
          </div>
        )}
      </ResponsiveModal>

      <AlertDialog
        open={avisosParaConfirmar != null}
        onOpenChange={(aberto) => !aberto && setAvisosParaConfirmar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Agendar mesmo assim?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <ul className="list-disc space-y-1 pl-5 text-left">
                {(avisosParaConfirmar ?? []).map((aviso) => (
                  <li key={aviso}>{aviso}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={agendando}>Voltar e ajustar</AlertDialogCancel>
            <AlertDialogAction
              disabled={agendando}
              onClick={(e) => {
                e.preventDefault();
                void executarAgendamento(true);
              }}
            >
              {agendando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Agendar assim mesmo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default RoteiroEditor;
