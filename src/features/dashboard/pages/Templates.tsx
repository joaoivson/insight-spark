import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquareText, Plus, Sparkles, Trash2, X } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  atualizarTemplate,
  criarTemplate,
  definirVariacoes,
  estilosDeIa,
  gerarVariacoes,
  listarTemplates,
  obterTemplate,
  removerTemplate,
  type EstiloIa,
  type Template,
  type TemplateDetalhe,
  type TipoTemplate,
  type VariacaoIn,
} from "@/services/templates.service";

const ROTULO_TIPO: Record<TipoTemplate, string> = {
  oferta: "Oferta",
  livre: "Livre",
};

const rotuloVariacoes = (n: number) => (n === 1 ? "1 variação" : `${n} variações`);

const novaVariacao = (corpo = ""): VariacaoIn => ({ corpo, peso: 1, ativa: true });

/** Linha de ajuda obrigatória: o marcador errado quebra a atribuição da comissão. */
const AjudaMarcadores = () => (
  <p className="text-xs text-muted-foreground">
    <code className="text-foreground">{"{produto}"}</code>{" "}
    <code className="text-foreground">{"{preco_por}"}</code>{" "}
    <code className="text-foreground">{"{link}"}</code>{" "}
    <code className="text-foreground">{"{cupom}"}</code> são preenchidos na hora do envio — o{" "}
    <code className="text-foreground">{"{link}"}</code> é o que atribui a comissão ao grupo.
  </p>
);

const Templates = () => {
  const { toast } = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // ── Novo template ─────────────────────────────────────────────────────────
  const [modalNovo, setModalNovo] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");
  const [tipoNovo, setTipoNovo] = useState<TipoTemplate>("oferta");
  const [criando, setCriando] = useState(false);

  // ── Detalhe / edição ──────────────────────────────────────────────────────
  const [detalhe, setDetalhe] = useState<TemplateDetalhe | null>(null);
  const [abrindo, setAbrindo] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoTemplate>("oferta");
  const [variacoes, setVariacoes] = useState<VariacaoIn[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Template | null>(null);

  // ── IA ────────────────────────────────────────────────────────────────────
  const [iaDisponivel, setIaDisponivel] = useState(false);
  const [estilos, setEstilos] = useState<EstiloIa[]>([]);
  const [painelIa, setPainelIa] = useState(false);
  const [textoBase, setTextoBase] = useState("");
  const [estilo, setEstilo] = useState("nenhum");
  const [quantidade, setQuantidade] = useState(3);
  const [gerando, setGerando] = useState(false);
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [escolhidas, setEscolhidas] = useState<Set<number>>(new Set());

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setTemplates(await listarTemplates());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Sem IA configurada o botão nem aparece — clicar e tomar erro é pior que não ter.
  useEffect(() => {
    estilosDeIa()
      .then((r) => {
        setIaDisponivel(r.disponivel);
        setEstilos(r.estilos ?? []);
      })
      .catch(() => setIaDisponivel(false));
  }, []);

  const abrirDetalhe = async (template: Template) => {
    setAbrindo(template.id);
    try {
      const d = await obterTemplate(template.id);
      setDetalhe(d);
      setNome(d.nome);
      setTipo(d.tipo);
      setVariacoes(d.variacoes.map((v) => ({ corpo: v.corpo, peso: v.peso, ativa: v.ativa })));
      setPainelIa(false);
      setSugestoes([]);
      setEscolhidas(new Set());
      setTextoBase("");
    } catch (e) {
      toast({
        title: "Não foi possível abrir o template",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setAbrindo(null);
    }
  };

  const confirmarCriacao = async () => {
    const nomeLimpo = nomeNovo.trim();
    if (!nomeLimpo) return;
    setCriando(true);
    try {
      const criado = await criarTemplate(nomeLimpo, tipoNovo);
      setTemplates((atual) => [
        {
          id: criado.id,
          nome: criado.nome,
          tipo: criado.tipo,
          ativo: criado.ativo,
          total_variacoes: criado.total_variacoes,
          criado_em: criado.criado_em,
        },
        ...atual,
      ]);
      setModalNovo(false);
      setNomeNovo("");
      setTipoNovo("oferta");
      setDetalhe(criado);
      setNome(criado.nome);
      setTipo(criado.tipo);
      setVariacoes(criado.variacoes.map((v) => ({ corpo: v.corpo, peso: v.peso, ativa: v.ativa })));
    } catch (e) {
      toast({
        title: "Não foi possível criar o template",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setCriando(false);
    }
  };

  const alternarAtivo = async (template: Template, ativo: boolean) => {
    const anterior = templates;
    setTemplates((atual) => atual.map((t) => (t.id === template.id ? { ...t, ativo } : t)));
    setOcupado(true);
    try {
      await atualizarTemplate(template.id, { ativo });
    } catch (e) {
      setTemplates(anterior); // rollback
      toast({
        title: "Não foi possível salvar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setOcupado(false);
    }
  };

  const excluir = async () => {
    if (!paraExcluir) return;
    setOcupado(true);
    try {
      await removerTemplate(paraExcluir.id);
      setTemplates((atual) => atual.filter((t) => t.id !== paraExcluir.id));
      if (detalhe?.id === paraExcluir.id) setDetalhe(null);
      toast({ title: "Template excluído" });
    } catch (e) {
      toast({
        title: "Não foi possível excluir",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setOcupado(false);
      setParaExcluir(null);
    }
  };

  const variacoesValidas = useMemo(
    () => variacoes.filter((v) => v.corpo.trim().length > 0),
    [variacoes],
  );

  const salvarDetalhe = async () => {
    if (!detalhe) return;
    setSalvando(true);
    try {
      if (nome.trim() !== detalhe.nome || tipo !== detalhe.tipo) {
        await atualizarTemplate(detalhe.id, { nome: nome.trim(), tipo });
      }
      const atualizado = await definirVariacoes(
        detalhe.id,
        variacoesValidas.map((v) => ({ ...v, corpo: v.corpo.trim() })),
      );
      setTemplates((atual) =>
        atual.map((t) =>
          t.id === atualizado.id
            ? {
                id: atualizado.id,
                nome: atualizado.nome,
                tipo: atualizado.tipo,
                ativo: atualizado.ativo,
                total_variacoes: atualizado.total_variacoes,
                criado_em: atualizado.criado_em,
              }
            : t,
        ),
      );
      setDetalhe(null);
      toast({ title: "Template salvo" });
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

  const gerar = async () => {
    if (!detalhe || textoBase.trim().length < 10) return;
    setGerando(true);
    try {
      const r = await gerarVariacoes(detalhe.id, {
        texto_base: textoBase.trim(),
        estilo: estilo === "nenhum" ? undefined : estilo,
        quantidade,
        salvar: false,
      });
      setSugestoes(r.variacoes);
      setEscolhidas(new Set(r.variacoes.map((_, i) => i)));
    } catch (e) {
      toast({
        title: "Não foi possível gerar as variações",
        description: `${(e as Error).message} Você também pode escrever as variações à mão.`,
        variant: "destructive",
      });
    } finally {
      setGerando(false);
    }
  };

  const adicionarSelecionadas = () => {
    const novas = sugestoes.filter((_, i) => escolhidas.has(i)).map((corpo) => novaVariacao(corpo));
    setVariacoes((atual) => [...atual, ...novas]);
    setSugestoes([]);
    setEscolhidas(new Set());
    setPainelIa(false);
  };

  return (
    <DashboardLayout title="Templates">
      <div className="space-y-5">
        {(carregando || templates.length > 0) && (
          <div className="flex items-center justify-end">
            <Button onClick={() => setModalNovo(true)} disabled={carregando}>
              <Plus className="mr-2 h-4 w-4" /> Novo template
            </Button>
          </div>
        )}

        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : erro ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">{erro}</p>
              <Button variant="outline" onClick={() => void carregar()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <MessageSquareText className="h-6 w-6 text-primary" />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhum template ainda</p>
              <ol className="max-w-xs list-decimal space-y-1 pl-5 text-left text-sm text-muted-foreground">
                <li>Crie o template e dê um nome.</li>
                <li>Escreva as variações da mensagem.</li>
                <li>Use o template num passo de oferta.</li>
              </ol>
              <Button onClick={() => setModalNovo(true)}>
                <Plus className="mr-2 h-4 w-4" /> Novo template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <MessageSquareText className="h-5 w-5 text-primary" />
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void abrirDetalhe(t)}
                        className="min-w-0 max-w-full truncate text-sm font-semibold text-foreground hover:underline"
                      >
                        {t.nome}
                      </button>
                      <Badge variant="secondary">{ROTULO_TIPO[t.tipo] ?? t.tipo}</Badge>
                    </div>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {rotuloVariacoes(t.total_variacoes)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 sm:flex-shrink-0">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={t.ativo}
                        disabled={ocupado}
                        onCheckedChange={(v) => void alternarAtivo(t, v)}
                        aria-label={t.ativo ? `Desativar ${t.nome}` : `Ativar ${t.nome}`}
                      />
                      {t.ativo ? "Ativo" : "Inativo"}
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={abrindo === t.id}
                      onClick={() => void abrirDetalhe(t)}
                    >
                      {abrindo === t.id && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={ocupado}
                      onClick={() => setParaExcluir(t)}
                      aria-label={`Excluir ${t.nome}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Novo template ── */}
      <ResponsiveModal
        open={modalNovo}
        onOpenChange={(o) => {
          setModalNovo(o);
          if (!o) {
            setNomeNovo("");
            setTipoNovo("oferta");
          }
        }}
        title="Novo template"
      >
        <div className="space-y-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="novo-nome">Nome</Label>
            <Input
              id="novo-nome"
              value={nomeNovo}
              onChange={(e) => setNomeNovo(e.target.value)}
              placeholder="Ex.: Oferta relâmpago"
              maxLength={120}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipoNovo} onValueChange={(v) => setTipoNovo(v as TipoTemplate)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oferta">Oferta</SelectItem>
                <SelectItem value="livre">Livre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() => void confirmarCriacao()}
            disabled={criando || !nomeNovo.trim()}
          >
            {criando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar template
          </Button>
        </div>
      </ResponsiveModal>

      {/* ── Detalhe / variações ── */}
      <ResponsiveModal
        open={detalhe != null}
        onOpenChange={(o) => !o && setDetalhe(null)}
        title={detalhe?.nome ?? "Template"}
        contentClassName="sm:max-w-2xl"
      >
        {detalhe && (
          <div className="max-h-[70vh] space-y-5 overflow-y-auto pb-2 pr-1">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="template-nome">Nome</Label>
                <Input
                  id="template-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoTemplate)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oferta">Oferta</SelectItem>
                    <SelectItem value="livre">Livre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Variações</Label>
                {iaDisponivel && (
                  <Button variant="outline" size="sm" onClick={() => setPainelIa((v) => !v)}>
                    <Sparkles className="mr-2 h-3.5 w-3.5" /> Gerar com IA
                  </Button>
                )}
              </div>
              <AjudaMarcadores />

              {painelIa && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ia-texto-base">Texto base</Label>
                    <Textarea
                      id="ia-texto-base"
                      value={textoBase}
                      onChange={(e) => setTextoBase(e.target.value)}
                      rows={3}
                      maxLength={4000}
                      placeholder="Ex.: {produto} por {preco_por}, corre que acaba: {link}"
                    />
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[180px] flex-1 space-y-1.5">
                      <Label>Estilo</Label>
                      <Select value={estilo} onValueChange={setEstilo}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhum">Sem estilo definido</SelectItem>
                          {estilos.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ia-quantidade">Quantidade</Label>
                      <Input
                        id="ia-quantidade"
                        type="number"
                        min={1}
                        max={10}
                        className="w-24 tabular-nums"
                        value={quantidade}
                        onChange={(e) =>
                          setQuantidade(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
                        }
                      />
                    </div>
                    <Button
                      onClick={() => void gerar()}
                      disabled={gerando || textoBase.trim().length < 10}
                    >
                      {gerando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Gerar
                    </Button>
                  </div>

                  {sugestoes.length > 0 && (
                    <div className="space-y-2">
                      {sugestoes.map((s, i) => (
                        <label
                          key={`${i}-${s.slice(0, 12)}`}
                          className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3"
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={escolhidas.has(i)}
                            onCheckedChange={() =>
                              setEscolhidas((atual) => {
                                const proximo = new Set(atual);
                                if (proximo.has(i)) proximo.delete(i);
                                else proximo.add(i);
                                return proximo;
                              })
                            }
                            aria-label={`Usar sugestão ${i + 1}`}
                          />
                          <span className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-foreground">
                            {s}
                          </span>
                        </label>
                      ))}
                      <Button
                        className="w-full"
                        disabled={escolhidas.size === 0}
                        onClick={adicionarSelecionadas}
                      >
                        Adicionar selecionadas ({escolhidas.size})
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {variacoes.length === 0 ? (
                <p className="rounded-xl border border-border py-6 text-center text-sm text-muted-foreground">
                  Nenhuma variação ainda. Adicione ao menos uma.
                </p>
              ) : (
                <div className="space-y-3">
                  {variacoes.map((v, i) => (
                    <div key={i} className="space-y-2 rounded-xl border border-border p-3">
                      <div className="flex items-start gap-2">
                        <Textarea
                          value={v.corpo}
                          onChange={(e) =>
                            setVariacoes((atual) =>
                              atual.map((x, j) =>
                                j === i ? { ...x, corpo: e.target.value } : x,
                              ),
                            )
                          }
                          rows={3}
                          maxLength={4000}
                          aria-label={`Variação ${i + 1}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0"
                          onClick={() =>
                            setVariacoes((atual) => atual.filter((_, j) => j !== i))
                          }
                          aria-label={`Remover variação ${i + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`peso-${i}`} className="text-xs text-muted-foreground">
                            Peso
                          </Label>
                          <Input
                            id={`peso-${i}`}
                            type="number"
                            min={1}
                            max={100}
                            className="h-8 w-20 text-right tabular-nums"
                            value={v.peso}
                            onChange={(e) =>
                              setVariacoes((atual) =>
                                atual.map((x, j) =>
                                  j === i
                                    ? {
                                        ...x,
                                        peso: Math.max(
                                          1,
                                          Math.min(100, Number(e.target.value) || 1),
                                        ),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Switch
                            checked={v.ativa}
                            onCheckedChange={(checked) =>
                              setVariacoes((atual) =>
                                atual.map((x, j) => (j === i ? { ...x, ativa: checked } : x)),
                              )
                            }
                            aria-label={`Variação ${i + 1} ativa`}
                          />
                          {v.ativa ? "Ativa" : "Inativa"}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setVariacoes((atual) => [...atual, novaVariacao()])}
              >
                <Plus className="mr-2 h-4 w-4" /> Adicionar variação
              </Button>
            </div>

            <Button
              className="w-full"
              onClick={() => void salvarDetalhe()}
              disabled={salvando || !nome.trim()}
            >
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar template
            </Button>
          </div>
        )}
      </ResponsiveModal>

      <AlertDialog open={!!paraExcluir} onOpenChange={(aberto) => !aberto && setParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{paraExcluir?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              As variações deste template também serão removidas. Passos de oferta que usavam
              este template passam a enviar só o texto próprio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void excluir()}
              disabled={ocupado}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Templates;
