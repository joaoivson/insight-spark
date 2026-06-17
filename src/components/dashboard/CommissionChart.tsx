import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/shared/lib/utils";
import { formatCurrency, formatK, type DashSeriesPoint, type ChartMode } from "@/shared/lib/chart-utils";

const BLUE = "#318CE9";
const CORAL = "#E58A7E";
const GREEN = "#2BD699";
const RED = "#FF6B66";
const AMBER = "#F0A94A";

const TipRow = ({ k, v, color }: { k: string; v: string; color?: string }) => (
  <div className="flex justify-between gap-6 leading-relaxed">
    <span className="text-muted-foreground">{k}</span>
    <span style={color ? { color } : undefined}>{v}</span>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as DashSeriesPoint | undefined;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-semibold">{label}</div>
      <TipRow k="Comissão" v={formatCurrency(p.comissao)} />
      <TipRow k="Gasto" v={formatCurrency(p.gasto)} />
      <TipRow k="Lucro" v={formatCurrency(p.lucro)} color={p.lucro >= 0 ? GREEN : RED} />
      <TipRow k="ROAS Real" v={p.roas ? `${p.roas.toFixed(2)}x` : "—"} color={AMBER} />
    </div>
  );
}

const LegendItem = ({ color, label, line }: { color: string; label: string; line?: boolean }) => (
  <span className="flex items-center gap-1.5">
    <span
      className="inline-block"
      style={line ? { width: 14, height: 3, borderRadius: 2, background: color } : { width: 11, height: 11, borderRadius: 3, background: color }}
    />
    {label}
  </span>
);

interface Props {
  daySeries: DashSeriesPoint[];
  monthSeries: DashSeriesPoint[];
}

const CommissionChart = ({ daySeries, monthSeries }: Props) => {
  const [mode, setMode] = useState<ChartMode>("day");
  const data = mode === "day" ? daySeries : monthSeries;

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Comissão, Gasto e Lucro por {mode === "day" ? "dia" : "mês"}</p>
          <p className="text-[11px] text-muted-foreground">valores com imposto aplicado</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-secondary/40 p-1 text-xs">
          {(["day", "month"] as ChartMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                mode === m
                  ? "border border-[rgba(49,140,233,0.38)] bg-[rgba(49,140,233,0.12)] font-medium text-[#7CB8F2]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "day" ? "Dia" : "Mês"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A93A3" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#8A93A3" }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => formatK(Number(v))} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="comissao" name="Comissão líquida" fill={BLUE} radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Bar dataKey="gasto" name="Gasto c/ imposto" fill={CORAL} radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Line dataKey="lucro" name="Lucro" stroke={GREEN} strokeWidth={3} dot={{ r: 3, fill: GREEN }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <LegendItem color={BLUE} label="Comissão líquida" />
        <LegendItem color={CORAL} label="Gasto c/ imposto" />
        <LegendItem color={GREEN} label="Lucro" line />
      </div>
    </div>
  );
};

export default CommissionChart;
