import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Loader2,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { DataCard, type DataCardField } from "@/components/shared/DataCard";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { mensagemAmigavel } from "@/services/http-error";
import {
  atualizarMonitoramento,
  criarMonitoramento,
  listarCapturas,
  listarMonitoramentos,
  removerMonitoramento,
  replicarCaptura,
  type Captura,
  type ErroDeMonitoramento,
  type Monitoramento,
  type StatusCaptura,
} from "@/services/monitoramentos.service";
import { listarGrupos, type GrupoWhatsapp } from "@/services/whatsapp_conexoes.service";
import { cn } from "@/shared/lib/utils";
import { rotuloDoGrupo } from "@/shared/lib/grupo";

/** Acima disso a lista de grupos não se percorre com o polegar — entra a busca. */
const GRUPOS_COM_BUSCA = 6;

/**
 * `http-error.ts` devolve o corpo cru quando o `detail` não é texto (validação
 * do FastAPI, HTML de proxy). Só os status em que o backend escreve a frase
 * PARA a usuária passam adiante: 403 (limite do plano), 409 (não deu para
 * religar a conexão agora) e 422 (nome vazio, grupo não encontrado, origem no
 * destino). O resto vira a mensagem fixa em PT-BR.
 *
 * O 422 do FastAPI por schema inválido devolve `detail` como LISTA, e aí o
 * `mensagemAmigavel` já cai no fallback — então só chega aqui o 422 escrito
 * pelo nosso service.
 */
const STATUS_COM_FRASE_PRONTA = new Set([403, 409, 422]);

const textoDoErro = (e: unknown, fixo: string): string => {
  const status = (e as ErroDeMonitoramento | undefined)?.status;
  return status !== undefined && STATUS_COM_FRASE_PRONTA.has(status)
    ? mensagemAmigavel(e, fixo)
    : fixo;
};

const dataHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const rotuloCapturas = (n: number) => (n === 1 ? "1 captura" : `${n} capturas`);

const STATUS: Record<StatusCaptura, { rotulo: string; classe: string }> = {
  capturada: { rotulo: "Capturada", classe: "border-border bg-muted text-muted-foreground" },
  replicando: { rotulo: "Replicando", classe: "border-amber-500/25 bg-amber-500/10 text-amber-500" },
  replicada: { rotulo: "Replicada", classe: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500" },
  ignorada: { rotulo: "Ignorada", classe: "border-border bg-muted text-muted-foreground" },
  erro: { rotulo: "Erro", classe: "border-destructive/30 bg-destructive/10 text-destructive" },
};

const StatusBadge = ({ status }: { status: StatusCaptura }) => {
  const s = STATUS[status] ?? { rotulo: status, classe: "border-border bg-muted text-muted-foreground" };
  return <Badge className={s.classe}>{s.rotulo}</Badge>;
};

/** `capturada` e `erro` são os dois estados que a afiliada consegue destravar. */
const podeReplicar = (c: Captura) => c.status === "capturada" || c.status === "erro";

/**
 * O link antes e depois — é o que prova que a oferta saiu com o link dela.
 *
 * O riscado só entra quando existe substituto: em captura ainda não replicada
 * o link do outro é o único que há, e riscá-lo diria que já foi trocado.
 */
const LinkTrocado = ({ captura }: { captura: Captura }) => {
  if (!captura.link_original && !captura.link_convertido) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="flex min-w-0 flex-col gap-1.5 text-xs">
      <span
        className={cn(
          "break-all text-muted-foreground",
          captura.link_convertido && "line-through decoration-muted-foreground/40",
        )}
      >
        {captura.link_original ?? "—"}
      </span>
      {captura.link_convertido && (
        <span className="flex min-w-0 items-start gap-1 font-medium text-emerald-500">
          <ArrowRight className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span className="break-all">{captura.link_convertido}</span>
        </span>
      )}
    </span>
  );
};

type Formulario = {
  nome: string;
  grupoOrigemId: number | null;
  somenteComLink: boolean;
  converterLinks: boolean;
  replicarAutomaticamente: boolean;
  palavrasChave: string[];
};

const FORM_VAZIO: Formulario = {
  nome: "",
  grupoOrigemId: null,
  somenteComLink: true,
  converterLinks: true,
  replicarAutomaticamente: false,
  palavrasChave: [],
};

const LinhaSwitch = ({
  id,
  rotulo,
  nota,
  checked,
  onCheckedChange,
}: {
  id: string;
  rotulo: string;
  /** Só aparece quando ligado — é aí que existe a consequência. */
  nota?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) => (
  <div className="rounded-lg border border-border p-3">
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
        {rotulo}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
    {checked && nota && <p className="mt-2 text-xs text-muted-foreground">{nota}</p>}
  </div>
);

/**
 * Aba "Monitoramento" da campanha de grupos.
 *
 * Lista os monitoramentos cujo destino é esta campanha, e as ofertas que cada
 * um capturou do grupo de origem.
 */
export const MonitoramentoDaCampanha = ({ campanhaId }: { campanhaId: number }) => {
  const { toast } = useToast();

  const [monitoramentos, setMonitoramentos] = useState<Monitoramento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [alternandoId, setAlternandoId] = useState<number | null>(null);

  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [capturas, setCapturas] = useState<Captura[]>([]);
  const [carregandoCapturas, setCarregandoCapturas] = useState(false);
  const [erroCapturas, setErroCapturas] = useState<string | null>(null);
  const [replicandoId, setReplicandoId] = useState<number | null>(null);

  const [grupos, setGrupos] = useState<GrupoWhatsapp[]>([]);
  const [erroGrupos, setErroGrupos] = useState<string | null>(null);

  const [modalForm, setModalForm] = useState(false);
  const [editando, setEditando] = useState<Monitoramento | null>(null);
  const [form, setForm] = useState<Formulario>(FORM_VAZIO);
  const [busca, setBusca] = useState("");
  const [palavra, setPalavra] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [paraExcluir, setParaExcluir] = useState<Monitoramento | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const selecionado = useMemo(
    () => monitoramentos.find((m) => m.id === selecionadoId) ?? null,
    [monitoramentos, selecionadoId],
  );
  const algumAtivo = monitoramentos.some((m) => m.ativo);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const lista = await listarMonitoramentos(campanhaId);
      setMonitoramentos(lista);
      setSelecionadoId((atual) =>
        atual != null && lista.some((m) => m.id === atual) ? atual : (lista[0]?.id ?? null),
      );
    } catch (e) {
      setErro(textoDoErro(e, "Não foi possível carregar os monitoramentos."));
    } finally {
      setCarregando(false);
    }
  }, [campanhaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Guarda de resposta obsoleta: trocar de monitoramento rápido resolvia por
  // ordem de CHEGADA, e a lista do anterior aparecia sob o nome do novo — sem
  // skeleton e sem erro, nada na tela indicava que estava errado. Pior: clicar
  // "Replicar" ali mandava o id de uma captura que não é daquele monitoramento
  // e o backend respondia 404.
  const pedidoDeCapturas = useRef(0);

  const carregarCapturas = useCallback(async (monitoramentoId: number) => {
    const meu = ++pedidoDeCapturas.current;
    setCarregandoCapturas(true);
    setErroCapturas(null);
    try {
      const lista = await listarCapturas(monitoramentoId);
      if (meu !== pedidoDeCapturas.current) return;
      setCapturas(lista);
    } catch (e) {
      if (meu !== pedidoDeCapturas.current) return;
      setCapturas([]);
      setErroCapturas(textoDoErro(e, "Não foi possível carregar as capturas."));
    } finally {
      if (meu === pedidoDeCapturas.current) setCarregandoCapturas(false);
    }
  }, []);

  useEffect(() => {
    if (selecionadoId == null) {
      pedidoDeCapturas.current += 1;   // invalida resposta em voo
      setCapturas([]);
      return;
    }
    void carregarCapturas(selecionadoId);
  }, [selecionadoId, carregarCapturas]);

  const carregarGrupos = useCallback(async () => {
    setErroGrupos(null);
    try {
      // §6.3: o monitoramento só processa grupos ativados — oferecer os outros
      // aqui criaria um monitoramento que nunca captura nada.
      setGrupos(await listarGrupos({ apenasAtivados: true }));
    } catch (e) {
      setErroGrupos(textoDoErro(e, "Não foi possível carregar os grupos."));
    }
  }, []);

  // ── Ações ──────────────────────────────────────────────────────────────────

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setBusca("");
    setPalavra("");
    setModalForm(true);
    void carregarGrupos();
  };

  const abrirEdicao = (m: Monitoramento) => {
    setEditando(m);
    setForm({
      nome: m.nome,
      grupoOrigemId: m.grupo_origem_id,
      somenteComLink: m.somente_com_link,
      converterLinks: m.converter_links,
      replicarAutomaticamente: m.replicar_automaticamente,
      palavrasChave: m.palavras_chave ?? [],
    });
    setBusca("");
    setPalavra("");
    setModalForm(true);
  };

  const salvar = async () => {
    const nome = form.nome.trim();
    if (!nome) return;
    setSalvando(true);
    try {
      if (editando) {
        // `grupo_origem_id` fica de fora: o backend não troca a origem de um
        // monitoramento existente.
        const atualizado = await atualizarMonitoramento(editando.id, {
          nome,
          somente_com_link: form.somenteComLink,
          converter_links: form.converterLinks,
          replicar_automaticamente: form.replicarAutomaticamente,
          palavras_chave: form.palavrasChave.length ? form.palavrasChave : null,
        });
        setMonitoramentos((atual) =>
          atual.map((m) => (m.id === atualizado.id ? atualizado : m)),
        );
        toast({ title: "Monitoramento salvo" });
      } else {
        if (form.grupoOrigemId == null) return;
        const criado = await criarMonitoramento({
          nome,
          grupo_origem_id: form.grupoOrigemId,
          destino_campanha_id: campanhaId,
          somente_com_link: form.somenteComLink,
          converter_links: form.converterLinks,
          replicar_automaticamente: form.replicarAutomaticamente,
          palavras_chave: form.palavrasChave.length ? form.palavrasChave : null,
        });
        setMonitoramentos((atual) => [criado, ...atual]);
        setSelecionadoId(criado.id);
        toast({ title: "Monitoramento criado" });
      }
      setModalForm(false);
    } catch (e) {
      toast({
        title: editando ? "Não foi possível salvar" : "Não foi possível criar",
        description: textoDoErro(
          e,
          editando
            ? "Confira os campos e tente de novo."
            : "Confira o nome e o grupo de origem e tente de novo.",
        ),
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  /**
   * O toggle não é um UPDATE: ligar faz a sessão do WhatsApp passar a escutar o
   * grupo. Recusado (409), o backend desfaz no banco — a tela tem de voltar
   * junto, senão mostra ligado o que está desligado.
   */
  const alternar = async (m: Monitoramento, ativo: boolean) => {
    setAlternandoId(m.id);
    setMonitoramentos((atual) =>
      atual.map((x) => (x.id === m.id ? { ...x, ativo } : x)),
    );
    try {
      const atualizado = await atualizarMonitoramento(m.id, { ativo });
      setMonitoramentos((atual) =>
        atual.map((x) => (x.id === atualizado.id ? atualizado : x)),
      );
    } catch (e) {
      setMonitoramentos((atual) =>
        atual.map((x) => (x.id === m.id ? { ...x, ativo: m.ativo } : x)),
      );
      toast({
        title: ativo ? "Não foi possível ligar" : "Não foi possível desligar",
        description: textoDoErro(e, "Tente de novo em instantes."),
        variant: "destructive",
      });
    } finally {
      setAlternandoId(null);
    }
  };

  const excluir = async () => {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      await removerMonitoramento(paraExcluir.id);
      setMonitoramentos((atual) => atual.filter((m) => m.id !== paraExcluir.id));
      setSelecionadoId((atual) => (atual === paraExcluir.id ? null : atual));
      setParaExcluir(null);
      toast({ title: "Monitoramento excluído" });
    } catch (e) {
      toast({
        title: "Não foi possível excluir",
        description: textoDoErro(e, "Tente de novo em instantes."),
        variant: "destructive",
      });
    } finally {
      setExcluindo(false);
    }
  };

  const replicar = async (captura: Captura) => {
    if (selecionadoId == null) return;
    setReplicandoId(captura.id);
    try {
      await replicarCaptura(selecionadoId, captura.id);
      toast({ title: "Oferta enviada para a fila" });
      await carregarCapturas(selecionadoId);
    } catch (e) {
      toast({
        title: "Não foi possível replicar",
        description: textoDoErro(e, "Tente de novo em instantes."),
        variant: "destructive",
      });
    } finally {
      setReplicandoId(null);
    }
  };

  // ── Formulário ─────────────────────────────────────────────────────────────

  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return grupos;
    return grupos.filter((g) => rotuloDoGrupo(g.nome, g.id).toLowerCase().includes(termo));
  }, [grupos, busca]);

  const adicionarPalavra = () => {
    const nova = palavra.trim().toLowerCase();
    if (!nova) return;
    setForm((f) =>
      f.palavrasChave.includes(nova)
        ? f
        : { ...f, palavrasChave: [...f.palavrasChave, nova] },
    );
    setPalavra("");
  };

  const removerPalavra = (alvo: string) =>
    setForm((f) => ({ ...f, palavrasChave: f.palavrasChave.filter((p) => p !== alvo) }));

  const formValido = form.nome.trim().length > 0 && (!!editando || form.grupoOrigemId != null);

  // ── Render ─────────────────────────────────────────────────────────────────

  const listaVazia = !carregando && !erro && monitoramentos.length === 0;

  return (
    <div className="space-y-4">
      {!listaVazia && (
        <div className="flex items-center justify-end">
          <Button onClick={abrirNovo} disabled={carregando}>
            <Plus className="mr-2 h-4 w-4" /> Novo monitoramento
          </Button>
        </div>
      )}

      {carregando ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
      ) : listaVazia ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Radio className="h-6 w-6 text-primary" />
            </span>
            <p className="text-sm font-medium text-foreground">Nenhum monitoramento ainda</p>
            <Button onClick={abrirNovo}>
              <Plus className="mr-2 h-4 w-4" /> Criar monitoramento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {monitoramentos.map((m) => (
            <Card
              key={m.id}
              className={cn(
                "transition-colors",
                m.id === selecionadoId && "border-primary/50 ring-1 ring-primary/25",
              )}
            >
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                    m.ativo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Radio className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelecionadoId(m.id)}
                      className="min-w-0 max-w-full truncate text-sm font-semibold text-foreground hover:underline"
                    >
                      {m.nome}
                    </button>
                    {m.ativo ? (
                      <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500">
                        Ligado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Desligado</Badge>
                    )}
                  </div>
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span className="truncate">{m.grupo_origem ?? "Grupo de origem removido"}</span>
                    <span className="tabular-nums">{rotuloCapturas(m.total_capturas)}</span>
                  </p>
                  {!!m.palavras_chave?.length && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {m.palavras_chave.map((p) => (
                        <Badge key={p} variant="outline" className="font-normal">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 sm:flex-shrink-0">
                  <Switch
                    checked={m.ativo}
                    disabled={alternandoId === m.id}
                    onCheckedChange={(v) => void alternar(m, v)}
                    aria-label={m.ativo ? "Desligar monitoramento" : "Ligar monitoramento"}
                    className="mr-2"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => abrirEdicao(m)}
                    aria-label="Editar monitoramento"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setParaExcluir(m)}
                    aria-label="Excluir monitoramento"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {algumAtivo && (
            <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              Enquanto estiver ligado, este número recebe as mensagens do grupo escolhido.
              Guardamos só as que passam no seu filtro, e nunca quem escreveu.
            </p>
          )}
        </div>
      )}

      {/* ── Capturas ────────────────────────────────────────────────────── */}
      {selecionado && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  Ofertas capturadas
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {selecionado.nome}
                  </span>
                </p>
                {/* O card anuncia o total, mas a lista traz as 50 mais
                    recentes. Sem dizer isso, a afiliada procura uma oferta que
                    ela sabe que existe e conclui que o produto perdeu. */}
                {selecionado.total_capturas > capturas.length && !carregandoCapturas && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Mostrando as {capturas.length} mais recentes de{" "}
                    <span className="tabular-nums">{selecionado.total_capturas}</span>.
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={carregandoCapturas}
                onClick={() => void carregarCapturas(selecionado.id)}
              >
                <RefreshCw
                  className={cn("mr-2 h-3.5 w-3.5", carregandoCapturas && "animate-spin")}
                />
                Atualizar
              </Button>
            </div>

            {carregandoCapturas ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : erroCapturas ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">{erroCapturas}</p>
                <Button variant="outline" onClick={() => void carregarCapturas(selecionado.id)}>
                  Tentar novamente
                </Button>
              </div>
            ) : capturas.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma oferta capturada ainda</p>
                {selecionado.ativo ? (
                  <Button
                    variant="outline"
                    onClick={() => void carregarCapturas(selecionado.id)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
                  </Button>
                ) : (
                  <Button onClick={() => void alternar(selecionado, true)}>
                    Ligar monitoramento
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[36%]">Mensagem</TableHead>
                        <TableHead className="w-[26%]">Link</TableHead>
                        {/* Largura fixa: em `erro` esta coluna carrega o motivo,
                            e sem ela a frase saía quebrada palavra a palavra. */}
                        <TableHead className="w-[22%]">Status</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {capturas.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="align-top">
                            <p className="line-clamp-3 whitespace-pre-line text-sm text-foreground">
                              {c.texto_original ?? c.texto_final ?? "—"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {dataHora(c.criado_em)}
                            </p>
                          </TableCell>
                          <TableCell className="align-top">
                            <LinkTrocado captura={c} />
                          </TableCell>
                          <TableCell className="align-top">
                            <StatusBadge status={c.status} />
                            {c.status === "erro" && c.motivo && (
                              <p className="mt-1 text-xs text-destructive">{c.motivo}</p>
                            )}
                          </TableCell>
                          <TableCell className="align-top text-right">
                            {podeReplicar(c) && (
                              <Button
                                size="sm"
                                variant={c.status === "erro" ? "outline" : "default"}
                                disabled={replicandoId === c.id}
                                onClick={() => void replicar(c)}
                              >
                                {replicandoId === c.id ? (
                                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="mr-2 h-3.5 w-3.5" />
                                )}
                                {c.status === "erro" ? "Tentar de novo" : "Replicar"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 md:hidden">
                  {capturas.map((c) => {
                    const campos: DataCardField[] = [
                      {
                        label: "Link antes",
                        value: (
                          <span
                            className={cn(
                              "block whitespace-normal break-all text-xs text-muted-foreground",
                              c.link_convertido && "line-through decoration-muted-foreground/40",
                            )}
                          >
                            {c.link_original ?? "—"}
                          </span>
                        ),
                      },
                      {
                        label: "Link agora",
                        value: (
                          <span
                            className={cn(
                              "block whitespace-normal break-all text-xs",
                              c.link_convertido
                                ? "font-medium text-emerald-500"
                                : "text-muted-foreground",
                            )}
                          >
                            {c.link_convertido ?? "—"}
                          </span>
                        ),
                      },
                      { label: "Capturada", value: dataHora(c.criado_em) },
                    ];
                    if (c.status === "erro" && c.motivo) {
                      campos.push({
                        label: "Motivo",
                        value: (
                          <span className="block whitespace-normal text-xs text-destructive">
                            {c.motivo}
                          </span>
                        ),
                      });
                    }
                    return (
                      <DataCard
                        key={c.id}
                        // `whitespace-pre-line` desfaz o `truncate` que o DataCard
                        // aplica no título — sem ele a mensagem sai cortada na
                        // primeira linha, e é ela o conteúdo do card.
                        title={
                          <span className="line-clamp-3 whitespace-pre-line break-words">
                            {c.texto_original ?? c.texto_final ?? "—"}
                          </span>
                        }
                        badge={<StatusBadge status={c.status} />}
                        fields={campos}
                        actions={
                          podeReplicar(c) ? (
                            <Button
                              size="sm"
                              variant={c.status === "erro" ? "outline" : "default"}
                              disabled={replicandoId === c.id}
                              onClick={() => void replicar(c)}
                            >
                              {replicandoId === c.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              <span className="ml-1.5">
                                {c.status === "erro" ? "Tentar de novo" : "Replicar"}
                              </span>
                            </Button>
                          ) : undefined
                        }
                      />
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Criar / editar ──────────────────────────────────────────────── */}
      <ResponsiveModal
        open={modalForm}
        onOpenChange={(o) => {
          setModalForm(o);
          if (!o) {
            setEditando(null);
            setForm(FORM_VAZIO);
            setBusca("");
            setPalavra("");
          }
        }}
        title={editando ? "Editar monitoramento" : "Novo monitoramento"}
      >
        <div className="space-y-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="monitoramento-nome">Nome</Label>
            <Input
              id="monitoramento-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex.: Ofertas do concorrente"
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Grupo de origem</Label>
            {editando ? (
              <div className="rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground">
                {editando.grupo_origem ?? "Grupo de origem removido"}
              </div>
            ) : erroGrupos ? (
              <div className="flex flex-col items-start gap-2 rounded-lg border border-border p-3">
                <p className="text-sm text-muted-foreground">{erroGrupos}</p>
                <Button variant="outline" size="sm" onClick={() => void carregarGrupos()}>
                  Tentar novamente
                </Button>
              </div>
            ) : grupos.length === 0 ? (
              <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                Nenhum grupo ativado. Sincronize e ative seus grupos em Configurações →
                WhatsApp.
              </div>
            ) : (
              <>
                {grupos.length > GRUPOS_COM_BUSCA && (
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar grupo"
                  />
                )}
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                  {gruposFiltrados.length === 0 ? (
                    <p className="px-3 py-2.5 text-sm text-muted-foreground">
                      Nenhum grupo com esse nome
                    </p>
                  ) : (
                    gruposFiltrados.map((g) => {
                      const marcado = form.grupoOrigemId === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, grupoOrigemId: g.id }))}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left transition-colors",
                            marcado ? "bg-primary/10" : "hover:bg-muted",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-foreground">{rotuloDoGrupo(g.nome, g.id)}</span>
                            <span className="block text-xs tabular-nums text-muted-foreground">
                              {g.participantes} membros
                            </span>
                          </span>
                          {marcado && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <LinhaSwitch
              id="monitoramento-somente-link"
              rotulo="Capturar só mensagens com link"
              checked={form.somenteComLink}
              onCheckedChange={(v) => setForm((f) => ({ ...f, somenteComLink: v }))}
            />
            <LinhaSwitch
              id="monitoramento-converter"
              rotulo="Trocar o link pelo meu"
              checked={form.converterLinks}
              onCheckedChange={(v) => setForm((f) => ({ ...f, converterLinks: v }))}
            />
            <LinhaSwitch
              id="monitoramento-automatico"
              rotulo="Replicar sem revisar"
              nota="Sem revisão: a oferta vai para os grupos assim que for capturada."
              checked={form.replicarAutomaticamente}
              onCheckedChange={(v) => setForm((f) => ({ ...f, replicarAutomaticamente: v }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monitoramento-palavra">Palavras-chave (opcional)</Label>
            <div className="flex gap-2">
              <Input
                id="monitoramento-palavra"
                value={palavra}
                onChange={(e) => setPalavra(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    adicionarPalavra();
                  }
                }}
                placeholder="Ex.: air fryer"
                maxLength={60}
              />
              <Button
                type="button"
                variant="outline"
                onClick={adicionarPalavra}
                disabled={!palavra.trim()}
              >
                Adicionar
              </Button>
            </div>
            {form.palavrasChave.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.palavrasChave.map((p) => (
                  <Badge key={p} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1 font-normal">
                    {p}
                    <button
                      type="button"
                      onClick={() => removerPalavra(p)}
                      aria-label={`Remover ${p}`}
                      className="rounded-full p-0.5 hover:bg-background/60"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button
            className="w-full"
            onClick={() => void salvar()}
            disabled={salvando || !formValido}
          >
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editando ? "Salvar" : "Criar monitoramento"}
          </Button>
        </div>
      </ResponsiveModal>

      {/* ── Excluir ─────────────────────────────────────────────────────── */}
      <ResponsiveModal
        open={!!paraExcluir}
        onOpenChange={(o) => {
          if (!o) setParaExcluir(null);
        }}
        title="Excluir monitoramento"
        description={
          paraExcluir
            ? `“${paraExcluir.nome}” e as capturas dele saem para sempre.`
            : undefined
        }
      >
        <div className="flex flex-col gap-2 pb-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setParaExcluir(null)} disabled={excluindo}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => void excluir()} disabled={excluindo}>
            {excluindo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </Button>
        </div>
      </ResponsiveModal>
    </div>
  );
};
