import { BarChart2, ShoppingCart, Target, TrendingUp, Package, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatCurrency, type DashTotals, type DashSeriesPoint } from "@/shared/lib/chart-utils";

// Cores do spec (alinhadas ao gráfico único): comissão azul, gasto coral, lucro verde, ROAS âmbar.
const BLUE = "#318CE9";
const CORAL = "#E58A7E";
const GREEN = "#2BD699";
const AMBER = "#F0A94A";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const w = 160;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      className="pointer-events-none absolute bottom-0 left-0 h-7 w-full opacity-40"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  accent: string;
  valueClass?: string;
  spark?: number[];
}

const Card = ({ label, value, sub, icon: Icon, accent, valueClass, spark }: CardProps) => (
  <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
    <div className="flex items-center gap-2">
      <span
        className="flex h-6 w-6 items-center justify-center rounded-md"
        style={{ backgroundColor: `${accent}22`, color: accent }}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
    <div className={cn("relative z-10 mt-3 text-xl font-semibold tabular-nums", valueClass)}>{value}</div>
    <div className="relative z-10 min-h-[14px] text-[10.5px] text-muted-foreground tabular-nums">{sub ?? " "}</div>
    {spark && spark.length > 1 && <Sparkline data={spark} color={accent} />}
  </div>
);

interface Props {
  totals: DashTotals;
  series: DashSeriesPoint[];
  hasTax: boolean;
}

const DashboardKpiCards = ({ totals, series, hasTax }: Props) => {
  const comissaoSpark = series.map((s) => s.comissao);
  const lucroSpark = series.map((s) => s.lucro);
  const roasSpark = series.map((s) => s.roas);
  const ordersSpark = series.map((s) => s.orders);

  const directPct = totals.orders > 0 ? Math.round((totals.directOrders / totals.orders) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <Card
        label="Comissão"
        value={formatCurrency(hasTax ? totals.comissaoBruta : totals.comissao)}
        sub={hasTax ? `líquido − imposto: ${formatCurrency(totals.comissao)}` : undefined}
        icon={BarChart2}
        accent={BLUE}
        spark={comissaoSpark}
      />
      <Card
        label="Gasto Anúncios"
        value={formatCurrency(hasTax ? totals.gastoPago : totals.gasto)}
        sub={hasTax ? `com imposto: ${formatCurrency(totals.gasto)}` : undefined}
        icon={ShoppingCart}
        accent={CORAL}
      />
      <Card
        label="Lucro Líquido"
        value={`${totals.lucro >= 0 ? "+" : ""}${formatCurrency(totals.lucro)}`}
        icon={Target}
        accent={GREEN}
        valueClass={totals.lucro >= 0 ? "text-success" : "text-destructive"}
        spark={lucroSpark}
      />
      <Card
        label="ROAS Real"
        value={`${totals.roas.toFixed(2)}x`}
        icon={TrendingUp}
        accent={AMBER}
        valueClass={totals.roas >= 1 ? "text-success" : totals.roas > 0 ? "text-warning" : "text-muted-foreground"}
        spark={roasSpark}
      />
      <Card
        label="Pedidos"
        value={totals.orders.toLocaleString("pt-BR")}
        sub={`diretos: ${totals.directOrders.toLocaleString("pt-BR")} · ${directPct}%`}
        icon={Package}
        accent={BLUE}
        spark={ordersSpark}
      />
    </div>
  );
};

export default DashboardKpiCards;
