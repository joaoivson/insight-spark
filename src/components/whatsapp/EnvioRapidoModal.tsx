import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon,
  Loader2,
  Pause,
  Play,
  Send,
  Trash2,
  Upload,
  X,
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
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/services/capture_site.service";
import {
  cancelar,
  envioRapido,
  pausar,
  progresso,
  retomar,
  type ExecucaoEnvio,
  type StatusExecucao,
} from "@/services/roteiros.service";
import { cn } from "@/shared/lib/utils";
import { useWhatsappConexoesStore } from "@/stores/whatsappConexoesStore";
import { rotuloDoGrupo } from "@/shared/lib/grupo";

/** Estimativa local antes do POST — o backend devolve a real na resposta. */
const SEGUNDOS_POR_GRUPO = 9;
const POLL_PROGRESSO_MS = 4_000;

const formatarDuracao = (segundos: number) => {
  if (segundos < 60) return "menos de 1 min";
  return `~${Math.ceil(segundos / 60)} min`;
};

const ROTULO_STATUS: Record<StatusExecucao, string> = {
  agendada: "Agendado",
  enviando: "Enviando…",
  pausada: "Pausado",
  concluida: "Concluído",
  cancelada: "Cancelado",
  falhou: "Falhou",
};

const BadgeStatus = ({ status }: { status: StatusExecucao }) => {
  if (status === "enviando") {
    return (
      <Badge className="border-blue-500/25 bg-blue-500/10 text-blue-400">
        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
        {ROTULO_STATUS[status]}
      </Badge>
    );
  }
  if (status === "concluida") {
    return (
      <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500">
        {ROTULO_STATUS[status]}
      </Badge>
    );
  }
  if (status === "falhou") {
    return <Badge variant="destructive">{ROTULO_STATUS[status]}</Badge>;
  }
  return <Badge variant="secondary">{ROTULO_STATUS[status]}</Badge>;
};

const Contador = ({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  destaque?: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-3 text-center">
    <p className={cn("text-lg font-semibold tabular-nums text-foreground", destaque)}>{valor}</p>
    <p className="text-xs text-muted-foreground">{rotulo}</p>
  </div>
);

type EnvioRapidoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Vincula o envio a uma campanha (quando aberto de dentro dela). */
  campanhaId?: number;
  /** Grupos pré-selecionados — ex.: os grupos abertos da campanha. */
  gruposPreSelecionados?: number[];
  /**
   * Pré-preenche o formulário na abertura — ex.: a oferta escolhida na tela de
   * Ofertas. Aplicado uma vez por abertura: depois disso o que vale é o que a
   * afiliada digitou, senão um re-render apagaria a edição dela.
   */
  valoresIniciais?: { texto?: string; oferta_url?: string; midia_url?: string };
};

export function EnvioRapidoModal({
  open,
  onOpenChange,
  campanhaId,
  gruposPreSelecionados,
  valoresIniciais,
}: EnvioRapidoModalProps) {
  const { toast } = useToast();
  const {
    grupos,
    loaded,
    error: erroConexoes,
    fetch: fetchConexoes,
  } = useWhatsappConexoesStore();

  const [fase, setFase] = useState<"form" | "progresso">("form");

  // ── Form ──────────────────────────────────────────────────────────────────
  const [texto, setTexto] = useState("");
  const [ofertaUrl, setOfertaUrl] = useState("");
  const [midiaUrl, setMidiaUrl] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [quando, setQuando] = useState<"agora" | "agendar">("agora");
  const [agendarPara, setAgendarPara] = useState<Date | undefined>(undefined);
  const [enviando, setEnviando] = useState(false);

  // ── Progresso ─────────────────────────────────────────────────────────────
  const [execucao, setExecucao] = useState<ExecucaoEnvio | null>(null);
  const [acaoLoading, setAcaoLoading] = useState<"pausar" | "retomar" | "cancelar" | null>(null);
  const [confirmCancelar, setConfirmCancelar] = useState(false);

  const inputImagemRef = useRef<HTMLInputElement>(null);
  const preSelAplicado = useRef(false);
  const valoresAplicados = useRef(false);
  const pollEmVoo = useRef(false);

  useEffect(() => {
    if (open) void fetchConexoes();
  }, [open, fetchConexoes]);

  // Pré-preenchimento (uma vez por abertura).
  useEffect(() => {
    if (!open || valoresAplicados.current) return;
    valoresAplicados.current = true;
    if (!valoresIniciais) return;
    if (valoresIniciais.texto) setTexto(valoresIniciais.texto);
    if (valoresIniciais.oferta_url) setOfertaUrl(valoresIniciais.oferta_url);
    if (valoresIniciais.midia_url) setMidiaUrl(valoresIniciais.midia_url);
  }, [open, valoresIniciais]);

  // Pré-seleção (uma vez por abertura), restrita aos grupos que permitem envio.
  useEffect(() => {
    if (!open || !loaded || preSelAplicado.current) return;
    preSelAplicado.current = true;
    if (!gruposPreSelecionados?.length) return;
    const permitidos = new Set(grupos.filter((g) => g.permite_envio).map((g) => g.id));
    setSelecionados(new Set(gruposPreSelecionados.filter((id) => permitidos.has(id))));
  }, [open, loaded, grupos, gruposPreSelecionados]);

  // Polling do progresso enquanto o envio está vivo. Fechar o modal para o
  // polling, não o envio — o backend segue sozinho.
  const execucaoId = execucao?.id;
  const statusExecucao = execucao?.status;
  useEffect(() => {
    if (!open || fase !== "progresso" || execucaoId == null) return;
    if (statusExecucao !== "enviando" && statusExecucao !== "agendada") return;
    const timer = setInterval(() => {
      if (pollEmVoo.current) return;
      pollEmVoo.current = true;
      progresso(execucaoId)
        .then(setExecucao)
        .catch(() => {
          /* falha pontual de rede — a próxima rodada tenta de novo */
        })
        .finally(() => {
          pollEmVoo.current = false;
        });
    }, POLL_PROGRESSO_MS);
    return () => clearInterval(timer);
  }, [open, fase, execucaoId, statusExecucao]);

  const fechar = (o: boolean) => {
    // Envio em curso: fechar por ESC/clique fora descartaria o id da execução
    // e não há tela que liste execuções — a afiliada perderia pausar/cancelar.
    if (!o && fase === "progresso" && execucao != null && !envioFinalizado) {
      toast({
        title: "Envio em andamento",
        description: "Pause ou cancele antes de fechar esta janela.",
      });
      return;
    }
    onOpenChange(o);
    if (!o) {
      setFase("form");
      setExecucao(null);
      setTexto("");
      setOfertaUrl("");
      setMidiaUrl("");
      setBusca("");
      setSelecionados(new Set());
      setQuando("agora");
      setAgendarPara(undefined);
      setConfirmCancelar(false);
      setAcaoLoading(null);
      preSelAplicado.current = false;
      valoresAplicados.current = false;
    }
  };

  const gruposOrdenados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const filtrados = q ? grupos.filter((g) => rotuloDoGrupo(g.nome, g.id).toLowerCase().includes(q)) : grupos;
    // Quem permite envio primeiro; os demais aparecem desabilitados no fim.
    return [...filtrados].sort(
      (a, b) =>
        Number(b.permite_envio) - Number(a.permite_envio) ||
        rotuloDoGrupo(a.nome, a.id).localeCompare(rotuloDoGrupo(b.nome, b.id)),
    );
  }, [grupos, busca]);

  const alternarGrupo = (grupoId: number) => {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(grupoId)) proximo.delete(grupoId);
      else proximo.add(grupoId);
      return proximo;
    });
  };

  const aoEscolherImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    try {
      const { url } = await uploadImage(file);
      setMidiaUrl(url);
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

  const temConteudo = texto.trim().length > 0 || !!midiaUrl || ofertaUrl.trim().length > 0;
  const agendamentoValido =
    quando === "agora" || (agendarPara != null && agendarPara.getTime() > Date.now());
  const podeEnviar = selecionados.size > 0 && temConteudo && agendamentoValido && !enviando;
  const estimativaS = selecionados.size * SEGUNDOS_POR_GRUPO;

  const submeter = async () => {
    if (!podeEnviar) return;
    setEnviando(true);
    try {
      const resultado = await envioRapido({
        texto: texto.trim() || undefined,
        midia_url: midiaUrl || undefined,
        oferta_url: ofertaUrl.trim() || undefined,
        grupo_ids: [...selecionados],
        campanha_id: campanhaId,
        ...(quando === "agendar" && agendarPara
          ? { agendar_para: agendarPara.toISOString() }
          : {}),
      });
      if (quando === "agendar" && agendarPara) {
        toast({
          title: `Agendado para ${format(agendarPara, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
          description: resultado.avisos.length ? resultado.avisos.join(" · ") : undefined,
        });
        fechar(false);
      } else {
        setExecucao(resultado);
        setFase("progresso");
      }
    } catch (e) {
      toast({
        title: "Não foi possível iniciar o envio",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  const executarAcao = async (acao: "pausar" | "retomar" | "cancelar") => {
    if (!execucao) return;
    setAcaoLoading(acao);
    try {
      const fn = acao === "pausar" ? pausar : acao === "retomar" ? retomar : cancelar;
      setExecucao(await fn(execucao.id));
    } catch (e) {
      toast({
        title:
          acao === "pausar"
            ? "Não foi possível pausar"
            : acao === "retomar"
              ? "Não foi possível retomar"
              : "Não foi possível cancelar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setAcaoLoading(null);
    }
  };

  // "agendada" com o modal aberto = o backend adiou para a próxima janela de
  // horário. Não há o que acompanhar agora: a tela vira final, com Fechar.
  const envioFinalizado =
    execucao != null &&
    ["concluida", "cancelada", "falhou", "agendada"].includes(execucao.status);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={fechar}
      title={fase === "form" ? "Enviar oferta" : "Progresso do envio"}
      contentClassName="sm:max-w-2xl"
    >
      {fase === "form" ? (
        <div className="space-y-4 pb-2">
          <div className="grid gap-4 md:grid-cols-2">
            {/* ── Conteúdo ── */}
            <div className="min-w-0 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="envio-texto">Texto</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {texto.length}/4000
                  </span>
                </div>
                <Textarea
                  id="envio-texto"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  maxLength={4000}
                  rows={5}
                  placeholder="Mensagem para os grupos…"
                />
                {ofertaUrl.trim() && (
                  <p className="text-xs text-muted-foreground">
                    Use {"{link}"} para posicionar o link da oferta.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="envio-oferta">Link da oferta (opcional)</Label>
                <Input
                  id="envio-oferta"
                  type="url"
                  inputMode="url"
                  value={ofertaUrl}
                  onChange={(e) => setOfertaUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>

              <div className="space-y-2">
                <Label>Imagem (opcional)</Label>
                <div className="flex items-center gap-3">
                  {midiaUrl && (
                    <div className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                      <img src={midiaUrl} alt="Imagem do envio" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setMidiaUrl("")}
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
                    onChange={(e) => void aoEscolherImagem(e)}
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
                    {midiaUrl ? "Trocar imagem" : "Adicionar imagem"}
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Grupos ── */}
            <div className="min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="envio-busca-grupos">Grupos</Label>
                {selecionados.size > 0 && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {selecionados.size} de {grupos.filter((g) => g.permite_envio).length}
                  </span>
                )}
              </div>
              {loaded && erroConexoes ? (
                /* Falha de CARGA não é "você não tem grupos": mandar a usuária
                   reconectar um número que já está conectado é pior que o erro. */
                <div className="space-y-3 rounded-xl border border-destructive/40 py-6 text-center">
                  <p className="px-4 text-sm text-destructive">
                    Não conseguimos carregar seus grupos agora.
                  </p>
                  <Button variant="outline" onClick={() => void fetchConexoes({ force: true })}>
                    Tentar de novo
                  </Button>
                </div>
              ) : loaded && grupos.length === 0 ? (
                <div className="space-y-3 rounded-xl border border-border py-6 text-center">
                  <p className="px-4 text-sm text-muted-foreground">
                    Nenhum grupo sincronizado ainda. Conecte um número e sincronize seus grupos.
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/dashboard/configuracoes?tab=numeros">Conectar número</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id="envio-busca-grupos"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar grupo…"
                  />
                  <div className="max-h-[38vh] space-y-1 overflow-y-auto rounded-xl border border-border p-1 md:max-h-64">
                    {!loaded ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Carregando grupos…
                      </div>
                    ) : gruposOrdenados.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        Nenhum grupo com esse nome.
                      </p>
                    ) : (
                      gruposOrdenados.map((g) => {
                        const semPermissao = !g.permite_envio;
                        return (
                          <label
                            key={g.id}
                            className={cn(
                              "flex min-h-[44px] items-center gap-3 rounded-lg px-2 py-2.5",
                              semPermissao
                                ? "cursor-not-allowed opacity-60"
                                : "cursor-pointer transition-colors hover:bg-accent/40",
                            )}
                          >
                            <Checkbox
                              checked={selecionados.has(g.id)}
                              disabled={semPermissao}
                              onCheckedChange={() => alternarGrupo(g.id)}
                              aria-label={`Selecionar ${rotuloDoGrupo(g.nome, g.id)}`}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                              {rotuloDoGrupo(g.nome, g.id)}
                            </span>
                            {semPermissao ? (
                              <Badge variant="outline" className="flex-shrink-0 text-muted-foreground">
                                sem permissão
                              </Badge>
                            ) : (
                              <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">
                                {g.participantes}
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Quando ── */}
          <div className="space-y-2" role="radiogroup" aria-label="Quando enviar">
            <Label>Quando</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={quando === "agora"}
                onClick={() => setQuando("agora")}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  quando === "agora"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent/40",
                )}
              >
                Agora
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={quando === "agendar"}
                onClick={() => setQuando("agendar")}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  quando === "agendar"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent/40",
                )}
              >
                Agendar
              </button>
            </div>
            {quando === "agendar" && (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !agendarPara && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {agendarPara
                        ? format(agendarPara, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
                        : "Selecionar data e horário"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={agendarPara}
                      onSelect={(date) => {
                        if (!date) return setAgendarPara(undefined);
                        const prev = agendarPara;
                        if (prev) date.setHours(prev.getHours(), prev.getMinutes());
                        setAgendarPara(new Date(date));
                      }}
                      disabled={(date) => {
                        const hoje = new Date();
                        hoje.setHours(0, 0, 0, 0);
                        return date < hoje;
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                    <div className="flex items-center gap-2 border-t border-border px-3 py-3">
                      <Label className="whitespace-nowrap text-xs text-muted-foreground">
                        Horário:
                      </Label>
                      <Input
                        type="time"
                        value={agendarPara ? format(agendarPara, "HH:mm") : ""}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const [h, m] = e.target.value.split(":").map(Number);
                          const date = agendarPara ? new Date(agendarPara) : new Date();
                          date.setHours(h, m, 0, 0);
                          setAgendarPara(new Date(date));
                        }}
                        className="h-8 w-24 text-sm"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                {agendarPara && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => setAgendarPara(undefined)}
                    aria-label="Limpar agendamento"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {quando === "agendar" && agendarPara && agendarPara.getTime() <= Date.now() && (
              <p className="text-xs text-destructive">Escolha uma data e horário no futuro.</p>
            )}
          </div>

          {/* ── Confirmação + enviar ── */}
          {selecionados.size > 0 && (
            <p className="text-sm text-muted-foreground">
              Será enviado para{" "}
              <span className="font-medium tabular-nums text-foreground">{selecionados.size}</span>{" "}
              {selecionados.size === 1 ? "grupo" : "grupos"} · duração estimada{" "}
              {formatarDuracao(estimativaS)}
            </p>
          )}
          <Button className="w-full" disabled={!podeEnviar} onClick={() => void submeter()}>
            {enviando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {quando === "agora" ? "Enviar agora" : "Agendar envio"}
          </Button>
        </div>
      ) : (
        execucao && (
          <div className="space-y-5 pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <BadgeStatus status={execucao.status} />
              {execucao.status === "agendada" && execucao.proxima_execucao_em ? (
                <span className="text-xs text-muted-foreground">
                  Início:{" "}
                  {format(new Date(execucao.proxima_execucao_em), "dd/MM 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              ) : !envioFinalizado ? (
                <span className="text-xs text-muted-foreground">
                  duração estimada {formatarDuracao(execucao.duracao_estimada_s)}
                </span>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="tabular-nums text-foreground">
                  {execucao.enviados}/{execucao.total}
                </span>
              </div>
              <Progress
                value={execucao.total > 0 ? (execucao.enviados / execucao.total) * 100 : 0}
                className="h-2"
                aria-label="Progresso do envio"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Contador rotulo="Enviados" valor={execucao.enviados} destaque="text-emerald-500" />
              <Contador
                rotulo="Erros"
                valor={execucao.erros}
                destaque={execucao.erros > 0 ? "text-destructive" : undefined}
              />
              <Contador rotulo="Pulados" valor={execucao.pulados} />
            </div>

            {execucao.avisos.length > 0 && (
              <ul className="space-y-1">
                {execucao.avisos.map((aviso, i) => (
                  <li key={i} className="text-xs text-amber-500">
                    {aviso}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {envioFinalizado ? (
                <Button className="w-full sm:w-auto" onClick={() => fechar(false)}>
                  Fechar
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground sm:w-auto"
                    disabled={acaoLoading != null}
                    onClick={() => setConfirmCancelar(true)}
                  >
                    {acaoLoading === "cancelar" && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Cancelar envio
                  </Button>
                  {execucao.status === "enviando" && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={acaoLoading != null}
                      onClick={() => void executarAcao("pausar")}
                    >
                      {acaoLoading === "pausar" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Pause className="mr-2 h-4 w-4" />
                      )}
                      Pausar
                    </Button>
                  )}
                  {execucao.status === "pausada" && (
                    <Button
                      className="w-full sm:w-auto"
                      disabled={acaoLoading != null}
                      onClick={() => void executarAcao("retomar")}
                    >
                      {acaoLoading === "retomar" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Retomar
                    </Button>
                  )}
                </>
              )}
            </div>

            <AlertDialog open={confirmCancelar} onOpenChange={setConfirmCancelar}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar este envio?</AlertDialogTitle>
                  <AlertDialogDescription>
                    As mensagens que ainda não saíram não serão enviadas. As já enviadas
                    permanecem nos grupos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void executarAcao("cancelar")}>
                    Cancelar envio
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )
      )}
    </ResponsiveModal>
  );
}
