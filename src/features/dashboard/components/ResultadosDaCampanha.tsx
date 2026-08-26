import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  MessagesSquare,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataCard, type DataCardField } from "@/components/shared/DataCard";
import { useToast } from "@/hooks/use-toast";
import {
  exportarLeads,
  obterResultados,
  type LinhaResultado,
  type ResultadosDaCampanha as Resultados,
  type TotaisResultado,
} from "@/services/campanhas_grupos.service";
import { mensagemAmigavel } from "@/services/http-error";
import { formatCurrency } from "@/shared/lib/chart-utils";
import { presetRangeKeys, type PresetKind } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";

type PeriodoKey = PresetKind | "custom";

const PERIODOS: { key: PresetKind; label: string }[] = [
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "7 dias" },
  { key: "14d", label: "14 dias" },
  { key: "month", label: "Mês atual" },
];

// Só no range personalizado: aqui a usuária escolheu os dias no calendário, então a
// data-chave vem do calendário LOCAL (getDate) — nunca de toISOString, que joga para UTC.
const paraChave = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const curto = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

// Tolerantes a chave ausente, como o formatCurrency já é: não existe
// ErrorBoundary no projeto, então um throw aqui levaria a página inteira.
const num = (v?: number | null) => (v ?? 0).toLocaleString("pt-BR");
const pct = (v?: number | null) => `${(v ?? 0).toFixed(1)}%`;

/** Lucro por pessoa é a métrica que decide o investimento — ganha cor e peso. */
const lucroClass = (v?: number | null) =>
  (v ?? 0) > 0 ? "text-success" : (v ?? 0) < 0 ? "text-destructive" : "text-foreground";

const KpiResultado = ({
  rotulo,
  valor,
  nota,
  destaque,
}: {
  rotulo: string;
  valor: string;
  /** Só aparece quando o número não existe — explica o "—" em vez de mostrar 0. */
  nota?: string;
  destaque?: boolean;
}) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tracking-tight tabular-nums md:text-xl",
          destaque && "text-primary",
        )}
      >
        {valor}
      </p>
      {nota && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{nota}</p>}
    </CardContent>
  </Card>
);

/** Métricas secundárias — só aparecem no "ver detalhes" de cada grupo. */
const DETALHES: { rotulo: string; valor: (l: LinhaResultado) => string }[] = [
  { rotulo: "Saídas", valor: (l) => num(l.saidas) },
  { rotulo: "Evasão", valor: (l) => pct(l.evasao_pct) },
  { rotulo: "Mensagens", valor: (l) => num(l.mensagens) },
  { rotulo: "Cliques", valor: (l) => num(l.cliques) },
  { rotulo: "Pedidos", valor: (l) => num(l.pedidos) },
  { rotulo: "Gasto atribuído", valor: (l) => formatCurrency(l.gasto_atribuido) },
];

const NOTA_EXPORT =
  "Data, grupo e origem de cada entrada do período selecionado. Não exportamos números de telefone — não coletamos os números de quem entra.";

const ERRO_CARGA = "Não foi possível carregar os resultados. Tente novamente.";
const ERRO_EXPORT = "Não foi possível exportar as entradas. Tente novamente.";

/** Aba "Resultados": desempenho por grupo no período, com o investimento em anúncios. */
export const ResultadosDaCampanha = ({
  campanhaId,
  onIrParaAba,
}: {
  campanhaId: number;
  /** Troca de aba dentro da própria página — o estado vazio precisa oferecer a ação. */
  onIrParaAba?: (aba: "grupos" | "anuncios") => void;
}) => {
  const { toast } = useToast();
  const [periodo, setPeriodo] = useState<PeriodoKey>("7d");
  const [rangePersonalizado, setRangePersonalizado] = useState<DateRange | undefined>();
  const [dados, setDados] = useState<Resultados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  /** Incrementado pelo "Tentar novamente" — refaz o effect sem duplicar a lógica. */
  const [tentativa, setTentativa] = useState(0);

  const intervalo = useMemo(() => {
    if (periodo === "custom" && rangePersonalizado?.from && rangePersonalizado?.to) {
      const [a, b] =
        rangePersonalizado.from <= rangePersonalizado.to
          ? [rangePersonalizado.from, rangePersonalizado.to]
          : [rangePersonalizado.to, rangePersonalizado.from];
      return { inicio: paraChave(a), fim: paraChave(b) };
    }
    const { startDate, endDate } = presetRangeKeys(periodo === "custom" ? "7d" : periodo);
    return { inicio: startDate, fim: endDate };
  }, [periodo, rangePersonalizado]);

  // Guarda de resposta obsoleta: trocar de chip rápido (7d→14d) resolvia por ordem
  // de chegada e a tabela podia mostrar 7 dias com o chip "14 dias" aceso — numa
  // tela que decide gasto de anúncio. Também evita setState depois do unmount (o
  // Radix desmonta a aba inativa) e o erro de A caindo em cima do sucesso de B.
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    obterResultados(campanhaId, intervalo)
      .then((r) => {
        if (!ativo) return;
        setDados(r);
        setErro(null);
      })
      .catch((e) => {
        if (!ativo) return;
        // Zera os dados junto com o erro: senão os KPIs do topo seguiam com os
        // números do período anterior em cima de um "Tentar novamente".
        setDados(null);
        setErro(mensagemAmigavel(e, ERRO_CARGA));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [campanhaId, intervalo, tentativa]);

  const alternarDetalhes = (grupoId: number) => {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(grupoId)) proximo.delete(grupoId);
      else proximo.add(grupoId);
      return proximo;
    });
  };

  const exportar = async () => {
    setExportando(true);
    try {
      // Mesmo período da tela — o CSV acompanha o filtro, não exporta desde sempre.
      const { blob, nome } = await exportarLeads(campanhaId, intervalo);
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = nome;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revogar no mesmo tick aborta o download no Safari do iOS — que é o
      // aparelho principal deste produto. Solta a URL depois que o navegador
      // já pegou os bytes.
      window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
    } catch (e) {
      toast({
        title: "Não foi possível exportar",
        description: mensagemAmigavel(e, ERRO_EXPORT),
        variant: "destructive",
      });
    } finally {
      setExportando(false);
    }
  };

  const linhas = dados?.linhas ?? [];
  const totais: TotaisResultado | null = dados?.totais ?? null;
  const anuncios = dados?.anuncios;
  const entradas = totais?.entradas ?? 0;
  const ficaram = totais?.ficaram ?? 0;

  // O backend manda `null` em CPL tanto SEM PIXEL quanto com `leads === 0` — a
  // divisão não existe nos dois casos. Derivar a nota do valor dividido fazia a
  // tela dizer "configure o pixel" com o pixel funcionando e reportando zero.
  // A causa está em `leads` / `entradas` / `ficaram`, não no quociente.
  const notaLeads = (): string | undefined =>
    anuncios?.leads == null ? "configure o pixel no link de entrada para medir" : undefined;

  const notaCpl = (): string | undefined => {
    if (anuncios?.cpl != null) return undefined;
    if (anuncios?.leads == null) return "configure o pixel no link de entrada para medir";
    return "nenhum lead no período";
  };

  const notaCustoEntrada = (): string | undefined => {
    if (anuncios?.custo_por_entrada != null) return undefined;
    return entradas === 0 ? "sem entradas registradas no período" : "sem investimento no período";
  };

  const notaCustoPermanencia = (): string | undefined => {
    if (anuncios?.custo_por_permanencia != null) return undefined;
    if (entradas === 0) return "sem entradas registradas no período";
    return ficaram === 0 ? "ninguém permaneceu no período" : "sem investimento no período";
  };

  return (
    <div className="space-y-4">
      {/* Filtro de período — chips visíveis, do jeito que a tela de Anúncios já faz. */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="inline-flex flex-shrink-0 rounded-lg border border-border bg-card p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={cn(
                "whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                periodo === p.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={periodo === "custom" ? "default" : "outline"}
              size="sm"
              className="h-9 flex-shrink-0"
            >
              <CalendarRange className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {periodo === "custom" && rangePersonalizado?.from && rangePersonalizado?.to
                  ? `${curto(rangePersonalizado.from)} – ${curto(rangePersonalizado.to)}`
                  : "Personalizado"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={rangePersonalizado}
              onSelect={(r) => {
                setRangePersonalizado(r);
                // Só troca o período com o intervalo fechado: no 1º clique `to` ainda
                // é undefined, e marcar "custom" aqui acendia o botão "Personalizado"
                // mostrando os últimos 7 dias — além de uma request a cada clique.
                if (r?.from && r?.to) setPeriodo("custom");
              }}
              numberOfMonths={1}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Investimento e custos — o bloco que responde "vale a pena?" */}
      {carregando ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[86px] w-full rounded-xl" />
          ))}
        </div>
      ) : anuncios ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiResultado
            rotulo="Investimento"
            valor={formatCurrency(anuncios.investimento_com_imposto)}
            nota={
              anuncios.campanhas_vinculadas === 0
                ? "nenhum anúncio vinculado — vincule na aba Anúncios"
                : `com imposto · ${anuncios.campanhas_vinculadas} ${
                    anuncios.campanhas_vinculadas === 1 ? "anúncio" : "anúncios"
                  }`
            }
            destaque
          />
          <KpiResultado
            rotulo="Leads"
            valor={anuncios.leads == null ? "—" : num(anuncios.leads)}
            nota={notaLeads()}
          />
          <KpiResultado
            rotulo="CPL"
            valor={anuncios.cpl == null ? "—" : formatCurrency(anuncios.cpl)}
            nota={notaCpl()}
          />
          <KpiResultado
            rotulo="Custo por entrada"
            valor={
              anuncios.custo_por_entrada == null
                ? "—"
                : formatCurrency(anuncios.custo_por_entrada)
            }
            nota={notaCustoEntrada()}
          />
          <KpiResultado
            rotulo="Custo por permanência"
            valor={
              anuncios.custo_por_permanencia == null
                ? "—"
                : formatCurrency(anuncios.custo_por_permanencia)
            }
            nota={notaCustoPermanencia()}
          />
        </div>
      ) : null}

      {carregando ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : erro ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">{erro}</p>
            <Button variant="outline" onClick={() => setTentativa((n) => n + 1)}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : linhas.length === 0 ? (
        // Linha por grupo: lista vazia = a campanha não tem grupo nenhum. As duas
        // causas reais são distinguíveis e cada uma tem uma ação — "Sem dados no
        // período" sozinho deixava a usuária sem saída.
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="rounded-full bg-accent/10 p-3">
              <Users className="h-6 w-6 text-accent" aria-hidden />
            </span>
            <p className="max-w-md text-sm text-muted-foreground">
              Esta campanha ainda não tem grupos — é deles que sai cada linha desta
              tabela.
            </p>
            {onIrParaAba && (
              <Button variant="outline" onClick={() => onIrParaAba("grupos")}>
                Adicionar grupos
              </Button>
            )}
            {anuncios?.campanhas_vinculadas === 0 && (
              <>
                <p className="max-w-md text-xs text-muted-foreground">
                  Também não há anúncio vinculado — sem isso não há custo por entrada
                  nem por permanência.
                </p>
                {onIrParaAba && (
                  <Button variant="ghost" size="sm" onClick={() => onIrParaAba("anuncios")}>
                    <MessagesSquare className="mr-2 h-4 w-4" /> Vincular anúncios
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-xl text-xs text-muted-foreground">{NOTA_EXPORT}</p>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 self-start"
              onClick={() => void exportar()}
              disabled={exportando}
            >
              {exportando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exportar entradas (CSV)
            </Button>
          </div>

          {/* Desktop: 6 colunas visíveis. O resto vive no "ver detalhes" de cada linha. */}
          <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead className="text-right">Participantes</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Comissão líquida</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Lucro por pessoa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => {
                  const aberto = abertos.has(l.grupo_id);
                  return [
                    <TableRow key={l.grupo_id}>
                      <TableCell className="max-w-[280px]">
                        <button
                          type="button"
                          onClick={() => alternarDetalhes(l.grupo_id)}
                          aria-expanded={aberto}
                          className="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {aberto ? (
                            <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{l.grupo ?? "(grupo sem nome)"}</span>
                        </button>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {num(l.participantes)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{num(l.entradas)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(l.comissao_liquida)}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", lucroClass(l.lucro))}>
                        {formatCurrency(l.lucro)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          lucroClass(l.lucro_por_pessoa),
                        )}
                      >
                        {formatCurrency(l.lucro_por_pessoa)}
                      </TableCell>
                    </TableRow>,
                    aberto ? (
                      <TableRow key={`${l.grupo_id}-detalhes`} className="hover:bg-transparent">
                        <TableCell colSpan={6} className="bg-muted/30">
                          <dl className="grid grid-cols-3 gap-3 lg:grid-cols-6">
                            {DETALHES.map((d) => (
                              <div key={d.rotulo} className="min-w-0">
                                <dt className="text-[11px] text-muted-foreground">{d.rotulo}</dt>
                                <dd className="mt-0.5 text-sm tabular-nums text-foreground">
                                  {d.valor(l)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                          {l.sub_id && (
                            <p className="mt-3 text-[11px] text-muted-foreground">
                              Sub ID {l.sub_id}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : null,
                  ];
                })}
              </TableBody>
              {totais && (
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="text-sm font-medium">Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(totais.participantes)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(totais.entradas)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(totais.comissao_liquida)}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", lucroClass(totais.lucro))}>
                      {formatCurrency(totais.lucro)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold tabular-nums",
                        lucroClass(totais.lucro_por_pessoa),
                      )}
                    >
                      {formatCurrency(totais.lucro_por_pessoa)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>

          {/* Mobile: um card por grupo, com o lucro por pessoa em destaque. */}
          <div className="space-y-3 md:hidden">
            {linhas.map((l) => {
              const aberto = abertos.has(l.grupo_id);
              const campos: DataCardField[] = [
                { label: "Participantes", value: <span className="tabular-nums">{num(l.participantes)}</span> },
                { label: "Entradas", value: <span className="tabular-nums">{num(l.entradas)}</span> },
                {
                  label: "Comissão líq.",
                  value: <span className="tabular-nums">{formatCurrency(l.comissao_liquida)}</span>,
                },
                {
                  label: "Lucro",
                  value: (
                    <span className={cn("tabular-nums", lucroClass(l.lucro))}>
                      {formatCurrency(l.lucro)}
                    </span>
                  ),
                },
                {
                  label: "Lucro por pessoa",
                  emphasis: true,
                  value: (
                    <span className={cn("tabular-nums", lucroClass(l.lucro_por_pessoa))}>
                      {formatCurrency(l.lucro_por_pessoa)}
                    </span>
                  ),
                },
              ];
              const detalhes: DataCardField[] = aberto
                ? DETALHES.map((d) => ({
                    label: d.rotulo,
                    value: <span className="tabular-nums">{d.valor(l)}</span>,
                  }))
                : [];
              return (
                <DataCard
                  key={l.grupo_id}
                  title={l.grupo ?? "(grupo sem nome)"}
                  fields={[...campos, ...detalhes]}
                  actions={
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => alternarDetalhes(l.grupo_id)}
                      aria-expanded={aberto}
                      aria-label={`Ver detalhes de ${l.grupo ?? "grupo sem nome"}`}
                    >
                      {aberto ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  }
                />
              );
            })}
            {totais && (
              <DataCard
                className="border-primary/30"
                title="Total"
                fields={[
                  { label: "Participantes", value: <span className="tabular-nums">{num(totais.participantes)}</span> },
                  { label: "Entradas", value: <span className="tabular-nums">{num(totais.entradas)}</span> },
                  {
                    label: "Comissão líq.",
                    value: <span className="tabular-nums">{formatCurrency(totais.comissao_liquida)}</span>,
                  },
                  {
                    label: "Lucro",
                    value: (
                      <span className={cn("tabular-nums", lucroClass(totais.lucro))}>
                        {formatCurrency(totais.lucro)}
                      </span>
                    ),
                  },
                  {
                    label: "Lucro por pessoa",
                    emphasis: true,
                    value: (
                      <span className={cn("tabular-nums", lucroClass(totais.lucro_por_pessoa))}>
                        {formatCurrency(totais.lucro_por_pessoa)}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
