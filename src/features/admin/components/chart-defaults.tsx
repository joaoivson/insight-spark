import { LabelList } from "recharts";

/**
 * Padrão visual único dos gráficos do painel admin (rodada 6, item 7).
 *
 * Sem gridlines de fundo, hover band escuro no lugar do destaque branco do
 * recharts, e valor exposto sem precisar de hover — o tooltip continua
 * existindo para o valor completo.
 */

/** Faixa de hover escura — o destaque branco/cinza padrão morre em fundo escuro. */
export const HOVER_BAND = "rgba(49,140,233,.08)";

export const BAR_CURSOR = { fill: HOVER_BAND } as const;
export const LINE_CURSOR = { stroke: HOVER_BAND, strokeWidth: 32 } as const;

/** Eixos sem linha e sem tick — só os números. Nenhum CartesianGrid nos gráficos. */
export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  fontSize: 11,
} as const;

/** Valor exposto: mono pequeno, cor clara discreta. */
export const LABEL_STYLE: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 10,
  fill: "#94a3b8",
};

/** Sem centavos: 1650.4 → "1.650". Zero vira string vazia (não polui o gráfico). */
export function formatMilhar(valor: number): string {
  if (!valor) return "";
  return Math.round(valor).toLocaleString("pt-BR");
}

export function ValueLabelList({
  dataKey,
  formatter = formatMilhar,
  position = "top",
}: {
  dataKey: string;
  formatter?: (valor: number) => string;
  position?: "top" | "right";
}) {
  return (
    <LabelList
      dataKey={dataKey}
      position={position}
      style={LABEL_STYLE}
      formatter={(v: number) => formatter(Number(v))}
    />
  );
}
