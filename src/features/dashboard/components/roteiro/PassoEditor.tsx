import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Settings2,
  ShoppingBag,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { CheckboxQuadrado } from "@/components/shared/CheckboxQuadrado";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/services/capture_site.service";
import type { GrupoDaCampanha } from "@/services/campanhas_grupos.service";
import {
  ACOES_DO_GRUPO,
  UNIDADES,
  type AcaoGrupo,
  type BlocoIn,
  type PassoIn,
  type TipoConteudo,
  type UnidadeOffset,
} from "@/services/roteiros.service";
import type { Template } from "@/services/templates.service";
import { cn } from "@/shared/lib/utils";

import { PreviaWhatsApp } from "./PreviaWhatsApp";

const ATALHOS_OFFSET = [10, 30, 60];

/** Amanhã em Brasília — passo novo não pode nascer já em vermelho. */
export const proximaDataBR = () => {
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const d = new Date(`${hoje}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
};

const CONTEUDOS: { valor: TipoConteudo; rotulo: string; Icone: typeof FileText }[] = [
  { valor: "mensagem", rotulo: "Mensagem", Icone: FileText },
  { valor: "oferta", rotulo: "Oferta", Icone: ShoppingBag },
  { valor: "acao_grupo", rotulo: "Ação no grupo", Icone: Settings2 },
];

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

/** Cartão de UM bloco de mensagem. */
const CartaoDeBloco = ({
  bloco,
  indice,
  total,
  onMudar,
  onMover,
  onRemover,
}: {
  bloco: BlocoIn;
  indice: number;
  total: number;
  onMudar: (patch: Partial<BlocoIn>) => void;
  onMover: (delta: -1 | 1) => void;
  onRemover: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const { toast } = useToast();

  const escolherImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviando(true);
    try {
      const { url } = await uploadImage(file);
      onMudar({ conteudo: url });
    } catch (err) {
      toast({
        title: "Não foi possível enviar a imagem",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex items-center gap-1">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold tabular-nums text-muted-foreground">
          {indice + 1}
        </span>
        <span className="mr-auto text-xs font-medium text-muted-foreground">
          {bloco.tipo === "imagem" ? "Imagem" : "Texto"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={indice === 0}
          onClick={() => onMover(-1)}
          aria-label={`Mover bloco ${indice + 1} para cima`}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={indice === total - 1}
          onClick={() => onMover(1)}
          aria-label={`Mover bloco ${indice + 1} para baixo`}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemover}
          aria-label={`Remover bloco ${indice + 1}`}
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {bloco.tipo === "texto" ? (
        <Textarea
          value={bloco.conteudo ?? ""}
          onChange={(e) => onMudar({ conteudo: e.target.value })}
          maxLength={4000}
          rows={4}
          placeholder="Mensagem para os grupos…"
          aria-label={`Texto do bloco ${indice + 1}`}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {bloco.conteudo && (
              <div className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                <img
                  src={bloco.conteudo}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onMudar({ conteudo: null })}
                  aria-label="Remover imagem"
                  className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void escolherImagem(e)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={enviando}
              onClick={() => inputRef.current?.click()}
            >
              {enviando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {bloco.conteudo ? "Trocar imagem" : "Adicionar imagem"}
            </Button>
          </div>
          <Textarea
            value={bloco.legenda ?? ""}
            onChange={(e) => onMudar({ legenda: e.target.value })}
            maxLength={4000}
            rows={2}
            placeholder="Legenda (opcional)"
            aria-label={`Legenda do bloco ${indice + 1}`}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Editor de UM passo, em tela cheia.
 *
 * Tela cheia e não modal por dois motivos. O primeiro é espaço: o passo virou
 * container de blocos, e uma caixa centralizada de 512px não comporta quatro
 * imagens mais um texto mais a prévia. O segundo é que o modal simplesmente
 * não rolava — `DialogContent` é `fixed` sem teto de altura, e nos tipos com
 * mais campos o botão "Concluir" ficava fora da tela, inalcançável.
 *
 * Salvar é IMPLÍCITO: "Concluir" aplica o passo e o rodapé do roteiro tem só
 * "Agendar". Antes eram duas ações separadas com um aviso laranja no meio
 * ("Salve os passos para a prévia refletir o que vai ser agendado") — e o
 * caminho natural era clicar em Agendar antes de salvar.
 */
export const PassoEditor = ({
  passo,
  indice,
  primeiro,
  grupos,
  templates,
  prefixo,
  sufixo,
  onMudar,
  onConcluir,
}: {
  passo: PassoIn;
  indice: number;
  primeiro: boolean;
  grupos: GrupoDaCampanha[];
  templates: Template[];
  /** Assinatura da campanha — o motor costura no 1º e no último bloco. */
  prefixo?: string | null;
  sufixo?: string | null;
  onMudar: (patch: Partial<PassoIn>) => void;
  onConcluir: () => void;
}) => {
  const selecionados = useMemo(
    () => new Set(passo.grupos_alvo_ids ?? []),
    [passo.grupos_alvo_ids],
  );

  const alterarBloco = (i: number, patch: Partial<BlocoIn>) =>
    onMudar({ blocos: passo.blocos.map((b, j) => (j === i ? { ...b, ...patch } : b)) });

  const moverBloco = (i: number, delta: -1 | 1) => {
    const destino = i + delta;
    if (destino < 0 || destino >= passo.blocos.length) return;
    const copia = [...passo.blocos];
    [copia[i], copia[destino]] = [copia[destino], copia[i]];
    onMudar({ blocos: copia });
  };

  const adicionarBloco = (tipo: "texto" | "imagem") =>
    onMudar({
      blocos: [...passo.blocos, { tipo, conteudo: "", legenda: null, template_id: null }],
    });

  /**
   * O que a prévia mostra — oferta e ação também têm forma no WhatsApp.
   *
   * Prefixo e sufixo da campanha entram UMA vez cada, no primeiro e no último
   * bloco com texto, exatamente como o motor costura (`_preparar_saida`). Sem
   * isso a prévia mentia nas duas pontas — justamente onde a assinatura dela
   * aparece.
   */
  const blocosDaPrevia: BlocoIn[] = (() => {
    const base: BlocoIn[] =
      passo.tipo_conteudo === "mensagem"
        ? passo.blocos.map((b) => ({ ...b }))
        : passo.tipo_conteudo === "oferta"
          ? [
              {
                tipo: "texto",
                conteudo: [passo.texto?.trim(), passo.oferta_url?.trim()]
                  .filter(Boolean)
                  .join("\n\n"),
              },
            ]
          : [];
    if (base.length === 0) return base;
    const campo = (b: BlocoIn): "legenda" | "conteudo" =>
      b.tipo === "imagem" ? "legenda" : "conteudo";
    const costurar = (...partes: (string | null | undefined)[]) =>
      partes.map((x) => (x ?? "").trim()).filter(Boolean).join("\n\n");
    if (prefixo?.trim()) {
      const c = campo(base[0]);
      base[0] = { ...base[0], [c]: costurar(prefixo, base[0][c]) };
    }
    if (sufixo?.trim()) {
      const ultimo = base.length - 1;
      const c = campo(base[ultimo]);
      base[ultimo] = { ...base[ultimo], [c]: costurar(base[ultimo][c], sufixo) };
    }
    return base;
  })();

  const acaoAtual = ACOES_DO_GRUPO.find((a) => a.valor === passo.acao);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <h2 className="mr-auto text-base font-semibold text-foreground">
          Passo {indice + 1}
        </h2>
        <Button variant="ghost" size="icon" onClick={onConcluir} aria-label="Fechar">
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[1100px] gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ── Configuração ── */}
          <div className="order-last min-w-0 space-y-6 lg:order-none">
            <Bloco titulo="Quando">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Quando">
                <Radio
                  rotulo="Hora fixa"
                  ativo={passo.tipo_tempo === "ancora"}
                  onClick={() =>
                    onMudar({
                      tipo_tempo: "ancora",
                      hora_fixa: passo.hora_fixa || "08:00",
                      // Semear a DATA junto: o modo relativo zera `data_fixa`,
                      // e voltar para "Hora fixa" deixava o passo sem data —
                      // salvar falhava por um campo que ela não viu sumir.
                      data_fixa: passo.data_fixa || proximaDataBR(),
                      offset_valor: null,
                      offset_unidade: null,
                    })
                  }
                />
                <Radio
                  rotulo="Depois do anterior"
                  disabled={primeiro}
                  ativo={passo.tipo_tempo === "relativo"}
                  onClick={() =>
                    onMudar({
                      tipo_tempo: "relativo",
                      offset_valor: passo.offset_valor ?? 10,
                      offset_unidade: passo.offset_unidade ?? "minutos",
                      hora_fixa: null,
                      data_fixa: null,
                    })
                  }
                />
              </div>

              {passo.tipo_tempo === "ancora" ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="passo-data" className="text-xs text-muted-foreground">
                      Data
                    </Label>
                    <Input
                      id="passo-data"
                      type="date"
                      className="w-40"
                      value={passo.data_fixa ?? ""}
                      onChange={(e) => onMudar({ data_fixa: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="passo-hora" className="text-xs text-muted-foreground">
                      Horário
                    </Label>
                    <Input
                      id="passo-hora"
                      type="time"
                      className="w-32"
                      value={passo.hora_fixa ?? ""}
                      onChange={(e) => onMudar({ hora_fixa: e.target.value || null })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100000}
                      className="w-24"
                      value={passo.offset_valor ?? 0}
                      onChange={(e) =>
                        onMudar({
                          offset_valor: Math.max(
                            0,
                            Math.min(100000, Number(e.target.value) || 0),
                          ),
                        })
                      }
                      aria-label="Quanto tempo depois do passo anterior"
                    />
                    <Select
                      value={passo.offset_unidade ?? "minutos"}
                      onValueChange={(v) =>
                        onMudar({ offset_unidade: v as UnidadeOffset })
                      }
                    >
                      <SelectTrigger className="w-32" aria-label="Unidade">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIDADES.map((u) => (
                          <SelectItem key={u.valor} value={u.valor}>
                            {u.rotulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                      depois do passo anterior
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ATALHOS_OFFSET.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          onMudar({ offset_valor: m, offset_unidade: "minutos" })
                        }
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
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="O quê">
                {CONTEUDOS.map((c) => (
                  <Radio
                    key={c.valor}
                    rotulo={c.rotulo}
                    ativo={passo.tipo_conteudo === c.valor}
                    onClick={() =>
                      onMudar({
                        tipo_conteudo: c.valor,
                        // Ação é EXCLUSIVA: uma por passo, sem blocos.
                        blocos:
                          c.valor === "mensagem"
                            ? passo.blocos.length
                              ? passo.blocos
                              : [{ tipo: "texto", conteudo: "" }]
                            : [],
                        acao:
                          c.valor === "acao_grupo"
                            ? (passo.acao ?? "renomear_grupo")
                            : null,
                      })
                    }
                  />
                ))}
              </div>

              {passo.tipo_conteudo === "mensagem" && (
                <div className="space-y-3">
                  {passo.blocos.map((b, i) => (
                    <CartaoDeBloco
                      key={i}
                      bloco={b}
                      indice={i}
                      total={passo.blocos.length}
                      onMudar={(patch) => alterarBloco(i, patch)}
                      onMover={(d) => moverBloco(i, d)}
                      onRemover={() =>
                        onMudar({ blocos: passo.blocos.filter((_, j) => j !== i) })
                      }
                    />
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => adicionarBloco("texto")}>
                      <Plus className="mr-2 h-4 w-4" /> Texto
                    </Button>
                    <Button variant="outline" onClick={() => adicionarBloco("imagem")}>
                      <ImageIcon className="mr-2 h-4 w-4" /> Imagem
                    </Button>
                  </div>
                  {passo.blocos.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      Saem em sequência, com alguns segundos entre um e outro.
                    </p>
                  )}
                </div>
              )}

              {passo.tipo_conteudo === "oferta" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="passo-oferta">Link da oferta</Label>
                    <Input
                      id="passo-oferta"
                      type="url"
                      inputMode="url"
                      placeholder="https://…"
                      value={passo.oferta_url ?? ""}
                      onChange={(e) => onMudar({ oferta_url: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Template (opcional)</Label>
                    <Select
                      value={passo.template_id ? String(passo.template_id) : "nenhum"}
                      onValueChange={(v) =>
                        onMudar({ template_id: v === "nenhum" ? null : Number(v) })
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
                      value={passo.texto ?? ""}
                      onChange={(e) => onMudar({ texto: e.target.value })}
                      maxLength={4000}
                      rows={4}
                      placeholder="Use {link} para posicionar o link da oferta."
                    />
                  </div>
                </div>
              )}

              {passo.tipo_conteudo === "acao_grupo" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Ação</Label>
                    <Select
                      value={passo.acao ?? "renomear_grupo"}
                      onValueChange={(v) =>
                        onMudar({ acao: v as AcaoGrupo, acao_parametro: null })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACOES_DO_GRUPO.map((a) => (
                          <SelectItem key={a.valor} value={a.valor}>
                            {a.rotulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ParametroDaAcao
                    acao={passo.acao ?? "renomear_grupo"}
                    valor={passo.acao_parametro ?? ""}
                    onMudar={(v) => onMudar({ acao_parametro: v || null })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {acaoAtual?.rotulo} só funciona nos grupos em que um dos seus
                    números é admin.
                  </p>
                </div>
              )}
            </Bloco>

            <Bloco titulo="Para quem">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Para quem">
                <Radio
                  rotulo="Todos os grupos"
                  ativo={passo.grupos_alvo === "todos"}
                  onClick={() => onMudar({ grupos_alvo: "todos", grupos_alvo_ids: null })}
                />
                <Radio
                  rotulo="Escolher grupos"
                  ativo={passo.grupos_alvo === "selecao"}
                  onClick={() => onMudar({ grupos_alvo: "selecao" })}
                />
              </div>

              {passo.grupos_alvo === "selecao" && (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
                  {grupos.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Esta campanha ainda não tem grupos.
                    </p>
                  ) : (
                    grupos.map((g) => (
                      <label
                        key={g.grupo_id}
                        className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/40"
                      >
                        {/* Quadrado, não redondo: o `rounded-sm` do tema vira
                            círculo numa caixa de 16px e ela lê "escolha uma". */}
                        <CheckboxQuadrado
                          checked={selecionados.has(g.grupo_id)}
                          onCheckedChange={() => {
                            const proximo = new Set(selecionados);
                            if (proximo.has(g.grupo_id)) proximo.delete(g.grupo_id);
                            else proximo.add(g.grupo_id);
                            onMudar({ grupos_alvo_ids: [...proximo] });
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
                    ))
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <Label htmlFor="passo-marcar-todos">Marcar todos do grupo</Label>
                <Switch
                  id="passo-marcar-todos"
                  checked={passo.marcar_todos === "sempre"}
                  onCheckedChange={(v) =>
                    onMudar({ marcar_todos: v ? "sempre" : "nunca" })
                  }
                />
              </div>
            </Bloco>
          </div>

          {/*
            ── Prévia ──
            `order-first` no celular: em coluna única a prévia cairia depois de
            "Para quem" e do "Marcar todos", ou seja, fora da tela justamente
            enquanto ela digita os blocos. Fica no topo e GRUDA lá — é o que
            "atualizando enquanto digita" quer dizer num aparelho sem coluna da
            direita. Teto menor no celular para não comer meia tela.
          */}
          <div className="order-first min-w-0 self-start lg:order-none lg:sticky lg:top-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Prévia
            </p>
            {passo.tipo_conteudo === "acao_grupo" ? (
              <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {acaoAtual?.rotulo}
                </span>
                {passo.acao_parametro ? (
                  <>
                    {" → "}
                    <span className="break-words text-foreground">
                      {passo.acao_parametro}
                    </span>
                  </>
                ) : null}
                <p className="mt-2 text-xs">Nada é enviado no grupo.</p>
              </div>
            ) : (
              <PreviaWhatsApp
                blocos={blocosDaPrevia}
                nomeDoGrupo={grupos[0]?.nome ?? undefined}
              />
            )}
          </div>
        </div>
      </div>

      <footer className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button onClick={onConcluir} className="w-full sm:w-auto">
          <Check className="mr-2 h-4 w-4" /> Concluir
        </Button>
      </footer>
    </div>
  );
};

const ParametroDaAcao = ({
  acao,
  valor,
  onMudar,
}: {
  acao: AcaoGrupo;
  valor: string;
  onMudar: (v: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const { toast } = useToast();

  if (acao === "renomear_grupo") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor="acao-nome">Novo nome do grupo</Label>
        <Input
          id="acao-nome"
          value={valor}
          onChange={(e) => onMudar(e.target.value)}
          maxLength={100}
        />
      </div>
    );
  }

  if (acao === "alterar_descricao") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor="acao-descricao">Nova descrição do grupo</Label>
        <Textarea
          id="acao-descricao"
          value={valor}
          onChange={(e) => onMudar(e.target.value)}
          maxLength={2000}
          rows={4}
        />
      </div>
    );
  }

  const escolher = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviando(true);
    try {
      const { url } = await uploadImage(file);
      onMudar(url);
    } catch (err) {
      toast({
        title: "Não foi possível enviar a imagem",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>Nova imagem do grupo</Label>
      <div className="flex items-center gap-3">
        {valor && (
          <img
            src={valor}
            alt=""
            className="h-16 w-16 flex-shrink-0 rounded-xl border border-border object-cover"
          />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void escolher(e)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={enviando}
          onClick={() => inputRef.current?.click()}
        >
          {enviando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {valor ? "Trocar imagem" : "Escolher imagem"}
        </Button>
      </div>
    </div>
  );
};
