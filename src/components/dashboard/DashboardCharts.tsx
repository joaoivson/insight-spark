import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import type { DatasetRow } from "./DataTable";
import { useMemo, useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";

const PIE_COLORS = ["hsl(210, 80%, 55%)", "hsl(222, 47%, 25%)", "hsl(24, 90%, 55%)", "hsl(273, 65%, 60%)"];
const BAR_COLOR = "hsl(210, 80%, 55%)";
const PROFIT_COLOR = "hsl(173, 80%, 40%)";
const COST_COLOR = "hsl(38, 92%, 50%)";

export type DrillDownType = "mes_ano" | "category" | "sub_id1" | "product" | "platform";

interface DashboardChartsProps {
  rows: DatasetRow[];
  onDrillDown?: (type: DrillDownType, value: string) => void;
  belowRevenueContent?: ReactNode;
}

const formatK = (value: number) => {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} Mil`;
  return value.toLocaleString("pt-BR");
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const cleanNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value
      .replace(/R\$/gi, "")
      .replace(/\s+/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");
    const num = Number(cleaned);
    if (Number.isFinite(num)) return num;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const getCommissionValue = (row: DatasetRow): number => {
  const raw = (row as any).raw_data || {};
  const parsed = cleanNumber(raw["Comissão do Item da Shopee(R$)"]);
  return parsed !== undefined ? parsed : 0;
};

const getAffiliateCommissionValue = (row: DatasetRow): number => {
  const raw = (row as any).raw_data || {};
  const parsed = cleanNumber(raw["Comissão líquida do afiliado(R$)"]);
  if (parsed !== undefined) return parsed;
  return getCommissionValue(row);
};

const groupByMesAno = (rows: DatasetRow[]) => {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const key = r.mes_ano || (r.date ? r.date.slice(0, 7) : "Sem Mês");
    map.set(key, (map.get(key) || 0) + getCommissionValue(r));
  });
  return Array.from(map.entries())
    .map(([key, value]) => {
      const [y, m] = key.split("-");
      const label = m && y ? `${m}/${y}` : key;
      return { key, label, value };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
};

const groupCommissionByDay = (rows: DatasetRow[]) => {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    if (!r.date) return;
    const key = r.date;
    map.set(key, (map.get(key) || 0) + getCommissionValue(r));
  });
  return Array.from(map.entries())
    .map(([key, value]) => {
      const d = new Date(key);
      const label = !isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : key;
      return { key, label, value };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
};

const groupRevenueProfitByMes = (rows: DatasetRow[]) => {
  const map = new Map<string, { revenue: number; cost: number; profit: number }>();
  rows.forEach((r) => {
    const key = r.mes_ano || "Sem Mês";
    const prev = map.get(key) || { revenue: 0, cost: 0, profit: 0 };
    const raw = (r as any).raw_data || {};
    const faturamento = cleanNumber(raw["Valor de Compra(R$)"]) ?? 0;
    const comissao = getAffiliateCommissionValue(r);
    const gasto = cleanNumber(raw["Valor gasto anuncios"]) ?? 0;
    const lucro = comissao - gasto; // alinhado aos cards: lucro = comissão líquida - gasto anúncios
    const custo = gasto; // exibir Gasto Anúncios
    map.set(key, {
      revenue: prev.revenue + faturamento,
      cost: prev.cost + custo,
      profit: prev.profit + lucro,
    });
  });
  return Array.from(map.entries())
    .map(([mes_ano, v]) => ({ mes_ano, ...v }))
    .sort((a, b) => a.mes_ano.localeCompare(b.mes_ano));
};

const groupByPlatform = (rows: DatasetRow[]) => {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const key = r.platform || r.sub_id1 || "Outros";
    map.set(key, (map.get(key) || 0) + getCommissionValue(r));
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

const groupByCategory = (rows: DatasetRow[]) => {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const key = r.category || "Sem categoria";
    map.set(key, (map.get(key) || 0) + getCommissionValue(r));
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
};

const ChannelPieChart = ({
  data,
  onDrillDown,
}: {
  data: any[];
  onDrillDown?: (value: string) => void;
}) => {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  const pieData = data.slice(0, 6);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-lg text-foreground">
          Comissão Pendente + Concluída por Canal
        </h3>
        <p className="text-sm text-muted-foreground">Distribuição percentual</p>
      </div>
      <div className="h-72 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              cursor="pointer"
              onClick={(d) => onDrillDown?.(d.name)}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => {
                const percent = total ? (value / total) * 100 : 0;
                return [`${percent.toFixed(2)}%`, ""];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {pieData.map((item, index) => {
          const percent = total ? (item.value / total) * 100 : 0;
          return (
            <div key={item.name} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-medium text-foreground ml-auto">{percent.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CategoryBarChart = ({
  data,
  onDrillDown,
}: {
  data: any[];
  onDrillDown?: (value: string) => void;
}) => (
  <div className="bg-card rounded-xl border border-border p-6">
    <div className="mb-4">
      <h3 className="font-display font-semibold text-lg text-foreground">
        Comissão Pendente + Concluída por Categoria
      </h3>
      <p className="text-sm text-muted-foreground">Top 12 categorias</p>
    </div>
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 24, right: 20, left: 100, bottom: 16 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={formatK} tickLine={false} axisLine={false} />
          <YAxis
            dataKey="name"
            type="category"
            width={130}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(v: number) => formatK(v)} />
          <Bar
            dataKey="value"
            fill={BAR_COLOR}
            radius={[0, 8, 8, 0]}
            cursor="pointer"
            onClick={(d) => onDrillDown?.(d.name)}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const MesAnoChart = ({
  data,
  mode,
  onModeChange,
  onDrillDown,
}: {
  data: any[];
  mode: "month" | "day";
  onModeChange: (mode: "month" | "day") => void;
  onDrillDown?: (value: string) => void;
}) => (
  <div className="bg-card rounded-xl border border-border p-6">
    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h3 className="font-display font-semibold text-lg text-foreground">
          Comissão Pendente + Concluída
        </h3>
        <p className="text-sm text-muted-foreground">
          {mode === "month" ? "Soma das comissões por mês" : "Soma das comissões por dia"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant={mode === "month" ? "default" : "outline"} onClick={() => onModeChange("month")}>
          Mês
        </Button>
        <Button size="sm" variant={mode === "day" ? "default" : "outline"} onClick={() => onModeChange("day")}>
          Dia
        </Button>
      </div>
    </div>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tickLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={formatK} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v: number) => formatK(v)} labelFormatter={(l) => `Período ${l}`} />
          <Bar
            dataKey="value"
            fill={BAR_COLOR}
            radius={[8, 8, 0, 0]}
            cursor="pointer"
            onClick={(d) => onDrillDown?.(d.key)}
          >
            <LabelList dataKey="value" position="top" formatter={(v: number) => formatK(v)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const RevenueProfitArea = ({ data, onDrillDown }: { data: any[]; onDrillDown?: (value: string) => void }) => {
  const periodLabel = useMemo(() => {
    if (!data || !data.length) return "Período exibido";
    const labels = data
      .map((item: any) => item?.mes_ano || item?.label || "")
      .filter((l: any) => typeof l === "string" && l.length >= 7);
    if (!labels.length) return "Período exibido";
    const toFmt = (l: string) => {
      const [y, m] = l.split("-");
      return y && m ? `${m}/${y}` : l;
    };
    const first = toFmt(labels[0]);
    const last = toFmt(labels[labels.length - 1]);
    return first === last ? first : `${first} a ${last}`;
  }, [data]);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-lg text-foreground">Comissão x Valor Gasto em Ads x Lucro</h3>
        <p className="text-sm text-muted-foreground">{periodLabel}</p>
      </div>
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          onClick={(d: any) => {
            if (d && d.activePayload && d.activePayload[0]) {
              onDrillDown?.(d.activePayload[0].payload.mes_ano);
            }
          }}
        >
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BAR_COLOR} stopOpacity={0.25} />
              <stop offset="95%" stopColor={BAR_COLOR} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PROFIT_COLOR} stopOpacity={0.25} />
              <stop offset="95%" stopColor={PROFIT_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="mes_ano" stroke="hsl(var(--muted-foreground))" tickLine={false} hide />
          <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={formatK} axisLine={false} tickLine={false} hide />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
            formatter={(v: number, _name: string, ctx) => {
              const key = ctx?.dataKey;
              const label =
                key === "revenue"
                  ? "Faturamento"
                  : key === "profit"
                  ? "Lucro (Comissão - Gasto Anúncios)"
                  : "Gasto Anúncios";
              return [formatCurrency(v), label];
            }}
            labelFormatter={(label) => {
              if (typeof label === "string" && label.length >= 7) {
                const [year, month] = label.split("-");
                if (year && month) return `${month}/${year}`;
              }
              return label;
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Faturamento"
            stroke={BAR_COLOR}
            fillOpacity={1}
            fill="url(#rev)"
            cursor="pointer"
          />
          <Area
            type="monotone"
            dataKey="cost"
            name="Gasto Anúncios"
            stroke={COST_COLOR}
            fillOpacity={0.25}
            fill="url(#prof)"
            cursor="pointer"
          />
          <Area
            type="monotone"
            dataKey="profit"
            name="Lucro (Comissão - Gasto Anúncios)"
            stroke={PROFIT_COLOR}
            fillOpacity={1}
            fill="url(#prof)"
            cursor="pointer"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    </div>
  );
};

const DashboardCharts = ({ rows, onDrillDown, belowRevenueContent }: DashboardChartsProps) => {
  const [commissionMode, setCommissionMode] = useState<"month" | "day">("month");

  if (!rows.length) {
    return (
      <div className="mt-6 text-muted-foreground text-sm">
        Nenhum dado disponível. Faça o upload de um CSV para visualizar gráficos.
      </div>
    );
  }

  const mesAnoData = groupByMesAno(rows);
  const commissionDayData = groupCommissionByDay(rows);
  const revProfitData = groupRevenueProfitByMes(rows);
  const channelData = groupByPlatform(rows);
  const categoryData = groupByCategory(rows);

  return (
    <div className="grid grid-cols-1 gap-6 mt-6">
      <MesAnoChart
        data={commissionMode === "month" ? mesAnoData : commissionDayData}
        mode={commissionMode}
        onModeChange={setCommissionMode}
        onDrillDown={(v) => onDrillDown?.("mes_ano", v)}
      />
      <RevenueProfitArea data={revProfitData} onDrillDown={(v) => onDrillDown?.("mes_ano", v)} />
      {belowRevenueContent}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChannelPieChart data={channelData} onDrillDown={(v) => onDrillDown?.("platform", v)} />
        <CategoryBarChart data={categoryData} onDrillDown={(v) => onDrillDown?.("category", v)} />
      </div>
    </div>
  );
};

export default DashboardCharts;
