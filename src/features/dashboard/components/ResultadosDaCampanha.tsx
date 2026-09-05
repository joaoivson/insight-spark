import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Link2,
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
import { VincularSubIdsModal } from "@/features/dashboard/components/VincularSubIdsModal";
import {
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
const pct = (v?: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);

/** Lucro é a métrica que decide o investimento — ganha cor. */
const lucroClass = (v?: number | null) =>
  (v ?? 0) > 0 ? "text-success" : (v ?? 0) < 0 ? "text-destructive" : "text-foreground";

const fmtRoas = (v?: number | null) => (v == null ? "—" : `${v.toFixed(2)}x`);

/**
 * Card de KPI. São OITO agora (eram cinco), então o tamanho encolheu: com o
 * corpo antigo eles quebravam em quatro linhas no desktop.
 */
const KpiResultado = ({
  rotulo,
  valor,
  nota,
  destaque,
  valorClass,
}: {
  rotulo: string;
  valor: string;
  /** Só aparece quando o número não existe — explica o "—" em vez de mostrar 0. */
  nota?: string;
  destaque?: boolean;
  valorClass?: string;
}) => (
  <Card>
    <CardContent className="p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{rotulo}</p>
      <p
        className={cn(
          "mt-0.5 text-base font-semibold tracking-tight tabular-nums lg:text-lg",
          destaque && "text-primary",
          valorClass,
        )}
      >
        {valor}
      </p>
      {nota && <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{nota}</p>}
    </CardContent>
  </Card>
);

/**
 * Métricas por grupo que ficam no card do mobile.
 *
 * No desktop viraram COLUNAS: Saídas, Evasão, Pedidos e Cliques subiram do
 * "ver detalhes" quando Gasto atribuído, Lucro e Lucro por pessoa saíram — os
 * três dependiam de um rateio que não existe. "Mensagens" continua aqui: não
 * está na lista de colunas pedida, mas o dado continua vindo e some da tela se
 * não tiver onde aparecer.
 */
const DETALHES: { rotulo: string; valor: (l: LinhaResultado) => string }[] = [
  { rotulo: "Saídas", valor: (l) => num(l.saidas) },
  { rotulo: "Ficaram", valor: (l) => num(l.ficaram) },
  { rotulo: "Evasão", valor: (l) => pct(l.evasao_pct) },
  { rotulo: "Mensagens", valor: (l) => num(l.mensagens) },
  { rotulo: "Cliques", valor: (l) => num(l.cliques) },
  { rotulo: "Pedidos", valor: (l) => num(l.pedidos) },
];

// O texto anterior ("Não exportamos números de telefone — não coletamos os
// números de quem entra") saiu: era FALSO desde a 079, e contradizia a própria
// política de privacidade, que já foi reescrita dizendo o contrário.
const NOTA_SEM_SUBID = "nenhuma venda rastreada — vincule um Sub ID";

const ERRO_CARGA = "Não foi possível carregar os resultados. Tente novamente.";

/** Aba "Resultados": desempenho por grupo no período, com o investimento em anúncios. */
export const ResultadosDaCampanha = ({
  campanhaId,
  onIrParaAba,
}: {
  campanhaId: number;
  /** Troca de aba dentro da própria página — o estado vazio precisa oferecer a ação. */
  onIrParaAba?: (aba: "grupos" | "anuncios") => void;
}) => {
  const [modalSubIds, setModalSubIds] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoKey>("7d");
  const [rangePersonalizado, setRangePersonalizado] = useState<DateRange | undefined>();
  const [dados, setDados] = useState<Resultados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
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

  // Com valor, a nota mostra o DENOMINADOR. "Custo por permanência R$32,64"
  // vinha de 1.305,73 ÷ 40, e o 40 não aparecia em lugar nenhum da tabela
  // (53 entradas, 45 saídas) — número sem como ser conferido é número em que
  // ela não confia.
  const notaCustoEntrada = (): string | undefined => {
    if (anuncios?.custo_por_entrada != null) return `${num(entradas)} entradas`;
    return entradas === 0 ? "sem entradas registradas no período" : "sem investimento no período";
  };

  const notaCustoPermanencia = (): string | undefined => {
    if (anuncios?.custo_por_permanencia != null) return `${num(ficaram)} ficaram no grupo`;
    if (entradas === 0) return "sem entradas registradas no período";
    return ficaram === 0 ? "ninguém permaneceu no período" : "sem investimento no período";
  };

  /**
   * Nenhuma venda rastreada para esta campanha.
   *
   * O backend só conta como medição o vínculo MANUAL de Sub ID ou um sub_id de
   * grupo que trouxe pedido de verdade — a mera existência do sub_id do grupo
   * não basta: ele nasce na ativação e só captura se as ofertas usarem os
   * links do MarketDash.
   *
   * Sem isso, comissão zero produzia "Lucro −R$1.305,73" e "ROAS 0.00x" em
   * vermelho — um prejuízo que ninguém mediu. É o mesmo erro já corrigido na
   * tela de Anúncios para campanha de grupo.
   */
  const semMedicao = (totais?.sub_ids_vinculados ?? 0) === 0;

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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
          ))}
        </div>
      ) : anuncios ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
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
          />
          {/* Comissão, Lucro e ROAS são REAIS aqui: vêm dos Sub IDs vinculados
              (dos grupos + os manuais), não de estimativa. E vivem só no nível
              da CAMPANHA — nenhum desce para grupo, porque o rateio que fazia
              isso era inventado.

              SEM nenhum Sub ID rastreando, os três viram "—". Comissão zero aí
              não é prejuízo: é ausência de medição. "Lucro −R$1.305,73" e
              "ROAS 0.00x" em vermelho afirmavam um prejuízo que ninguém mediu
              — o mesmo erro já corrigido na tela de Anúncios. */}
          <KpiResultado
            rotulo="Comissão"
            valor={semMedicao ? "—" : formatCurrency(totais?.comissao_liquida ?? 0)}
            nota={semMedicao ? NOTA_SEM_SUBID : undefined}
          />
          <KpiResultado
            rotulo="Lucro"
            valor={semMedicao ? "—" : formatCurrency(totais?.lucro ?? 0)}
            nota={semMedicao ? NOTA_SEM_SUBID : undefined}
            valorClass={semMedicao ? undefined : lucroClass(totais?.lucro)}
            destaque={!semMedicao}
          />
          <KpiResultado
            rotulo="ROAS Real"
            valor={semMedicao ? "—" : fmtRoas(totais?.roas)}
            nota={
              semMedicao
                ? NOTA_SEM_SUBID
                : totais?.roas == null
                  ? "sem investimento no período"
                  : undefined
            }
            valorClass={
              semMedicao || totais?.roas == null
                ? undefined
                : totais.roas >= 1
                  ? "text-success"
                  : "text-destructive"
            }
          />
          {/* "Leads" do Meta é CLIQUE no link, não entrada confirmada: o pixel
              dispara no carregamento da página do /g/, antes do redirect para
              o convite. Por isso 1.348 conviviam com 53 entradas, e o CPL de
              R$0,97 ficava lado a lado com R$24,64 de custo por entrada — dois
              nomes que pareciam a mesma coisa. O rótulo passa a dizer o que o
              número é. */}
          <KpiResultado
            rotulo="Cliques no link"
            valor={anuncios.leads == null ? "—" : num(anuncios.leads)}
            nota={notaLeads()}
          />
          <KpiResultado
            rotulo="Custo por clique"
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
          {/* "Exportar leads" saiu daqui (05/09): Resultados é leitura de
              desempenho, e a ação de exportar pertence à aba Grupos, onde ela
              escolhe quais grupos entram. */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setModalSubIds(true)}>
              <Link2 className="mr-2 h-4 w-4" /> Vincular Sub ID
            </Button>
          </div>

          {/*
            Desktop: 9 colunas, todas visíveis.

            Saídas, Evasão, Pedidos e Cliques subiram do "ver detalhes" quando
            Gasto atribuído, Lucro e Lucro por pessoa saíram — os três
            dependiam de ratear o gasto da campanha entre os grupos, e não há
            informação para essa divisão. Sem eles o expandable perdeu razão de
            existir aqui, e o Sub ID virou coluna em vez de texto solto.

            A comissão por grupo continua REAL: vem do Sub ID do grupo (`wg…`).
          */}
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead className="text-right">Participantes</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Saídas</TableHead>
                  <TableHead className="text-right">Ficaram</TableHead>
                  <TableHead className="text-right">Evasão</TableHead>
                  <TableHead className="text-right">Comissão líquida</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead>Sub ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.grupo_id}>
                    <TableCell className="max-w-[220px]">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {l.grupo ?? "(grupo sem nome)"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(l.participantes)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{num(l.entradas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(l.saidas)}</TableCell>
                    {/* `ficaram` é o denominador do "custo por permanência" — sem
                        a coluna, aquele card era um número que não dava para
                        conferir contra nada da tabela. */}
                    <TableCell className="text-right tabular-nums">{num(l.ficaram)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pct(l.evasao_pct)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(l.comissao_liquida)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{num(l.pedidos)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(l.cliques)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {l.sub_id ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
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
                      {num(totais.saidas)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(totais.ficaram)}
                    </TableCell>
                    {/* Vem do backend: é o conjunto inteiro, não a média das
                        evasões por grupo — e usa a MESMA base da linha
                        (participantes + saídas), senão a coluna e o rodapé
                        discordariam. */}
                    <TableCell className="text-right tabular-nums">
                      {pct(totais.evasao_pct)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(totais.comissao_liquida)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(totais.pedidos)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(totais.cliques)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>

          {/* Mobile: um card por grupo, com a comissão em destaque — lucro e
              lucro por pessoa saíram junto com o rateio que os produzia. */}
          <div className="space-y-3 md:hidden">
            {linhas.map((l) => {
              const aberto = abertos.has(l.grupo_id);
              const campos: DataCardField[] = [
                { label: "Participantes", value: <span className="tabular-nums">{num(l.participantes)}</span> },
                { label: "Entradas", value: <span className="tabular-nums">{num(l.entradas)}</span> },
                {
                  label: "Comissão líq.",
                  emphasis: true,
                  value: <span className="tabular-nums">{formatCurrency(l.comissao_liquida)}</span>,
                },
                {
                  label: "Sub ID",
                  value: (
                    <span className="font-mono text-xs text-muted-foreground">
                      {l.sub_id ?? "—"}
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
                  { label: "Saídas", value: <span className="tabular-nums">{num(totais.saidas)}</span> },
                  {
                    // Evasão do total é saídas ÷ entradas do conjunto, não a
                    // média das evasões por grupo.
                    label: "Evasão",
                    value: (
                      <span className="tabular-nums">
                        {totais.entradas ? pct((totais.saidas / totais.entradas) * 100) : "—"}
                      </span>
                    ),
                  },
                  {
                    label: "Comissão líq.",
                    emphasis: true,
                    value: <span className="tabular-nums">{formatCurrency(totais.comissao_liquida)}</span>,
                  },
                  { label: "Pedidos", value: <span className="tabular-nums">{num(totais.pedidos)}</span> },
                  { label: "Cliques", value: <span className="tabular-nums">{num(totais.cliques)}</span> },
                ]}
              />
            )}
          </div>
        </>
      )}

      <VincularSubIdsModal
        open={modalSubIds}
        onOpenChange={setModalSubIds}
        campanhaId={campanhaId}
        periodo={intervalo}
        onSalvo={() => setTentativa((n) => n + 1)}
      />
    </div>
  );
};
