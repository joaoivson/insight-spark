import type { ReactNode } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/shared/lib/chart-utils";

type NamedValue = { name: string; value: number };

const PALETTE = ["#318CE9", "#2BD699", "#F0A94A", "#E58A7E", "#A78BFA", "#56C2E6", "#F472B6", "#94A3B8"];

const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="mb-4 text-sm font-medium">{title}</p>
    {children}
  </div>
);

/** Barras horizontais com scroll interno e altura fixa. Nomes longos truncam. */
function Bars({ rows }: { rows: NamedValue[] }) {
  if (!rows.length) return <p className="text-xs text-muted-foreground">Sem dados no período.</p>;
  const max = rows[0].value || 1;
  return (
    <div className="flex max-h-[240px] flex-col gap-2.5 overflow-y-auto pr-1.5 text-[11.5px]">
      {rows.map((r, i) => {
        const w = max > 0 ? Math.round((r.value / max) * 100) : 0;
        const color = PALETTE[i % PALETTE.length];
        return (
          <div key={`${r.name}-${i}`}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate text-muted-foreground" title={r.name}>{r.name}</span>
              <span className="shrink-0 font-medium tabular-nums">{formatCurrency(r.value)}</span>
            </div>
            <div className="h-[5px] rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
          </div>
        );
      })}
    </div>
  );
}

/** Rosca + lista (canal). Bloco fixo (poucas fontes), sem scroll. */
function ChannelDonut({ rows }: { rows: NamedValue[] }) {
  if (!rows.length) return <p className="text-xs text-muted-foreground">Sem dados no período.</p>;
  const total = rows.reduce((a, r) => a + r.value, 0);
  const top = rows.slice(0, 6);
  const centerLabel = total >= 1000 ? `R$ ${(total / 1000).toFixed(1)}k` : formatCurrency(total);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[116px] w-[116px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={top} dataKey="value" nameKey="name" innerRadius={38} outerRadius={56} paddingAngle={2} stroke="none">
              {top.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[8px] uppercase tracking-wide text-muted-foreground">Total</span>
          <span className="text-[13px] font-semibold tabular-nums">{centerLabel}</span>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2.5 text-xs">
        {top.map((r, i) => {
          const pct = total > 0 ? Math.round((r.value / total) * 100) : 0;
          return (
            <div key={`${r.name}-${i}`} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                <span className="truncate" title={r.name}>{r.name}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                <b>{formatCurrency(r.value)}</b> <span className="text-[10px] text-muted-foreground">{pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  channel: NamedValue[];
  category: NamedValue[];
  subId: NamedValue[];
}

const CommissionBlocks = ({ channel, category, subId }: Props) => (
  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_1fr_1fr]">
    <Block title="Comissão por canal">
      <ChannelDonut rows={channel} />
    </Block>
    <Block title="Por categoria">
      <Bars rows={category} />
    </Block>
    <Block title="Por Sub ID">
      <Bars rows={subId} />
    </Block>
  </div>
);

export default CommissionBlocks;
