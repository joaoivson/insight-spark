import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessagesSquare } from "lucide-react";

import { DataCard, type DataCardField } from "@/components/shared/DataCard";
import { Skeleton } from "@/components/ui/skeleton";
import { isProductionHost } from "@/core/config/api.config";
import { obterResumoDeGrupos, type ResumoDeGrupos } from "@/services/campanhas_grupos.service";
import { usePlanStore } from "@/stores/planStore";
import { formatCurrency } from "@/shared/lib/chart-utils";
import { cn } from "@/shared/lib/utils";

const TOP = 3;

// Tolerantes a chave ausente: não há ErrorBoundary no projeto, então um throw
// aqui derrubaria o Dashboard inteiro por causa de um bloco secundário.
const num = (v?: number | null) => (v ?? 0).toLocaleString("pt-BR");
const lucroClass = (v?: number | null) =>
  (v ?? 0) > 0 ? "text-success" : (v ?? 0) < 0 ? "text-destructive" : "text-foreground";

/** "19/08 – 25/08" a partir das chaves YYYY-MM-DD do backend. */
const periodoCurto = (p?: { inicio?: string; fim?: string } | null) => {
  const dm = (k?: string) => (k && k.length >= 10 ? `${k.slice(8, 10)}/${k.slice(5, 7)}` : null);
  const a = dm(p?.inicio);
  const b = dm(p?.fim);
  return a && b ? `${a} – ${b}` : null;
};

const Numero = ({
  rotulo,
  valor,
  valorClass,
  destaque,
}: {
  rotulo: string;
  valor: string;
  valorClass?: string;
  destaque?: boolean;
}) => (
  <div className="min-w-0">
    {/* Rótulo à direita também: com o número alinhado à direita e o rótulo à
        esquerda, os dois descolam e a coluna deixa de se ler como uma coisa só. */}
    <p className="text-right text-[11px] text-muted-foreground">{rotulo}</p>
    <p
      className={cn(
        "mt-1 text-right tabular-nums",
        destaque ? "text-lg font-semibold md:text-xl" : "text-sm font-medium",
        valorClass,
      )}
    >
      {valor}
    </p>
  </div>
);

/**
 * Bloco secundário do Dashboard: totais das campanhas de grupos no mesmo período
 * da tela.
 *
 * Some por completo em três casos — produção (o módulo é hml-only e o endpoint é
 * MAX-only, daria 403), nenhuma campanha ativa (dashboard de quem não usa grupos
 * não ganha bloco vazio) e erro. Silêncio é proposital: é um bloco secundário e
 * não pode derrubar a tela principal.
 */
export const ResumoDeGruposCard = ({ inicio, fim }: { inicio?: string; fim?: string }) => {
  // Duas portas diferentes: host (o módulo é hml-only) E plano (o endpoint é
  // MAX-only). Sem a segunda, conta essencial/pro em homologação dispara uma
  // request que dá 403 garantido. Ver a regra `planos-e-menus.md`.
  const { allowsMenu, fetch: fetchPlano } = usePlanStore();
  const habilitado = !isProductionHost() && allowsMenu("campanhas_grupos");

  const [resumo, setResumo] = useState<ResumoDeGrupos | null>(null);
  const [carregando, setCarregando] = useState(false);
  /** Já houve uma resposta (boa ou ruim)? Governa skeleton e descarte. */
  const jaRespondeu = useRef(false);

  useEffect(() => {
    void fetchPlano();
  }, [fetchPlano]);

  useEffect(() => {
    if (!habilitado) return;
    let ativo = true;
    // Skeleton só na primeira carga. Em recarga, colapsar o bloco num retângulo
    // de 168px pisca a cada troca de filtro — e para quem não tem campanha
    // pintava um esqueleto fantasma que some logo depois.
    if (!jaRespondeu.current) setCarregando(true);
    obterResumoDeGrupos({ inicio, fim })
      .then((r) => ativo && setResumo(r))
      .catch(() => {
        // Mantém o último resumo bom: um 500 transitório fazendo o bloco sumir
        // é indistinguível de "você não tem campanhas" (mesmo bug da F6).
        if (ativo && !jaRespondeu.current) setResumo(null);
      })
      .finally(() => {
        if (!ativo) return;
        jaRespondeu.current = true;
        setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [habilitado, inicio, fim]);

  if (!habilitado) return null;
  if (carregando) return <Skeleton className="h-[168px] w-full rounded-xl" />;
  if (!resumo || resumo.campanhas_ativas === 0) return null;

  const t = resumo.totais ?? ({} as Partial<ResumoDeGrupos["totais"]>);
  const topo = (resumo.por_campanha ?? []).slice(0, TOP);
  // Sem filtro na tela (a usuária limpou), o backend cai nos últimos 30 dias
  // enquanto o resto do Dashboard mostra tudo. Rotular evita comparar períodos
  // diferentes sem perceber.
  const periodoDivergente = !inicio || !fim ? periodoCurto(resumo.periodo) : null;
  // O backend soma no máximo 20 campanhas. Corte silencioso lê-se como "somei
  // todas" — e a usuária decide investimento em cima deste número.
  const somadas = resumo.campanhas_ativas - resumo.campanhas_omitidas;
  const meta = [
    `Investimento ${formatCurrency(resumo.investimento_com_imposto)}`,
    `Leads ${resumo.leads == null ? "—" : num(resumo.leads)}`,
    `Custo por entrada ${
      resumo.custo_por_entrada == null ? "—" : formatCurrency(resumo.custo_por_entrada)
    }`,
  ].join(" · ");

  const campos: DataCardField[] = [
    { label: "Participantes", value: <span className="tabular-nums">{num(t.participantes)}</span> },
    { label: "Entradas", value: <span className="tabular-nums">{num(t.entradas)}</span> },
    {
      label: "Lucro",
      value: (
        <span className={cn("tabular-nums", lucroClass(t.lucro))}>{formatCurrency(t.lucro)}</span>
      ),
    },
    {
      label: "Lucro por pessoa",
      emphasis: true,
      value: (
        <span className={cn("tabular-nums", lucroClass(t.lucro_por_pessoa))}>
          {t.lucro_por_pessoa == null ? "—" : formatCurrency(t.lucro_por_pessoa)}
        </span>
      ),
    },
  ];

  const lista = (
    <ul className="space-y-1">
      {topo.map((c) => (
        <li key={c.campanha_id}>
          <Link
            to={`/dashboard/grupos/${c.campanha_id}?tab=resultados`}
            className="flex min-h-[40px] items-center justify-between gap-3 rounded-lg px-2 transition-colors hover:bg-accent/40"
          >
            <span className="min-w-0 truncate text-sm text-foreground">{c.nome}</span>
            <span
              className={cn(
                "flex-shrink-0 text-right text-sm font-semibold tabular-nums",
                lucroClass(c.lucro_por_pessoa),
              )}
            >
              {c.lucro_por_pessoa == null ? "—" : formatCurrency(c.lucro_por_pessoa)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessagesSquare className="h-4 w-4 text-muted-foreground" aria-hidden />
          Campanhas de grupos
        </h2>
        <Link
          to="/dashboard/grupos"
          className="inline-flex flex-shrink-0 items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
        >
          Ver todas <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      {/* Desktop: os 4 números em linha. Mobile: DataCard, o padrão da casa. */}
      <div className="mt-4 hidden grid-cols-4 gap-4 md:grid">
        <Numero rotulo="Participantes" valor={num(t.participantes)} />
        <Numero rotulo="Entradas" valor={num(t.entradas)} />
        <Numero rotulo="Lucro" valor={formatCurrency(t.lucro)} valorClass={lucroClass(t.lucro)} />
        <Numero
          rotulo="Lucro por pessoa"
          valor={t.lucro_por_pessoa == null ? "—" : formatCurrency(t.lucro_por_pessoa)}
          valorClass={lucroClass(t.lucro_por_pessoa)}
          destaque
        />
      </div>
      <div className="mt-4 md:hidden">
        <DataCard title="Total no período" fields={campos} />
      </div>

      <p className="mt-3 text-[11px] tabular-nums text-muted-foreground">
        {periodoDivergente && (
          <span className="mr-1 font-medium text-foreground">{periodoDivergente} ·</span>
        )}
        {meta}
      </p>

      {resumo.campanhas_omitidas > 0 && (
        <p className="mt-2 text-[11px] text-warning">
          Somando as {somadas} primeiras de {resumo.campanhas_ativas} campanhas ativas.{" "}
          <Link to="/dashboard/grupos" className="underline underline-offset-2">
            Ver todas
          </Link>
        </p>
      )}

      {topo.length > 0 && <div className="mt-3 border-t border-border pt-2">{lista}</div>}
    </section>
  );
};
