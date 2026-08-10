import type { TooltipProps } from "recharts";

/**
 * Tooltip escuro pros gráficos do painel admin — o tooltip branco do recharts
 * estourava em cima do fundo escuro do app. Cores do sistema (ver doc de
 * correções do painel admin, item 5).
 */
type AdminChartTooltipProps = TooltipProps<number, string> & {
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string | number) => string;
};

export function AdminChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
}: AdminChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const labelExibido = label !== undefined && labelFormatter ? labelFormatter(label) : label;
  return (
    <div
      className="rounded-md px-3 py-2 text-xs shadow-lg"
      style={{
        background: "#0d1726",
        border: "1px solid rgba(49,140,233,.38)",
        color: "#e2e8f0",
      }}
    >
      {labelExibido !== undefined && <p className="mb-1 font-medium">{labelExibido}</p>}
      {payload.map((p, i) => {
        const raw = typeof p.value === "number" ? p.value : Number(p.value);
        const display = valueFormatter && !Number.isNaN(raw) ? valueFormatter(raw) : p.value;
        return (
          <p key={i} style={{ color: (p.color as string) || "#e2e8f0" }}>
            {p.name}: <span className="font-medium">{display}</span>
          </p>
        );
      })}
    </div>
  );
}

export const CHART_COLORS = {
  blue: "#318CE9",
  green: "#2BD699",
  red: "#ef4444",
} as const;
