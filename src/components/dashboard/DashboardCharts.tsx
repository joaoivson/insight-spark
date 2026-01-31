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
import { motion, AnimatePresence } from "framer-motion";
import { toDateKey, isBeforeDateKey, isAfterDateKey, parseDateOnly } from "@/shared/lib/date";
import { getComissaoAfiliado } from "@/shared/lib/kpi";

const PIE_COLORS = ["hsl(210, 80%, 55%)", "hsl(222, 47%, 25%)", "hsl(24, 90%, 55%)", "hsl(273, 65%, 60%)"];
const BAR_COLOR = "hsl(210, 80%, 55%)";
const PROFIT_COLOR = "hsl(173, 80%, 40%)";
const COST_COLOR = "hsl(38, 92%, 50%)";

export type DrillDownType = "mes_ano" | "category" | "sub_id1" | "product" | "platform";

interface DashboardChartsProps {
  rows: DatasetRow[];
  adSpends?: any[];
  dateRange?: { from?: Date; to?: Date };
  subIdFilter?: string;
  onDrillDown?: (type: DrillDownType, value: string) => void;
  belowRevenueContent?: ReactNode;
}

const formatK = (value: number) => {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} Mil`;
  return value.toLocaleString("pt-BR");
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  color: "hsl(var(--foreground))",
};
const tooltipCursor = { fill: "transparent" };

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

// Use the same function as kpi.ts to ensure consistency with cards
const getAffiliateCommissionValue = (row: DatasetRow): number => {
  return getComissaoAfiliado(row);
};

const groupByMesAno = (rows: DatasetRow[], dateRange?: { from?: Date; to?: Date }) => {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    // Skip if no date
    if (!r.date) return;
    
    // Filter by dateRange
    if (dateRange?.from && isBeforeDateKey(r.date, dateRange.from)) return;
    if (dateRange?.to && isAfterDateKey(r.date, dateRange.to)) return;
    
    const key = r.mes_ano || r.date.slice(0, 7);
    map.set(key, (map.get(key) || 0) + getAffiliateCommissionValue(r));
  });
  return Array.from(map.entries())
    .map(([key, value]) => {
      const [y, m] = key.split("-");
      const label = m && y ? `${m}/${y}` : key;
      return { key, label, value };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
};

const groupCommissionByDay = (rows: DatasetRow[], dateRange?: { from?: Date; to?: Date }) => {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    if (!r.date) return;
    
    // Filter by dateRange
    if (dateRange?.from && isBeforeDateKey(r.date, dateRange.from)) return;
    if (dateRange?.to && isAfterDateKey(r.date, dateRange.to)) return;
    
    const key = r.date;
    map.set(key, (map.get(key) || 0) + getAffiliateCommissionValue(r));
  });
  return Array.from(map.entries())
    .map(([key, value]) => {
      const d = parseDateOnly(key);
      const label = d && !isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : key;
      return { key, label, value };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
};

const groupRevenueProfitByMes = (rows: DatasetRow[], adSpends: any[] = [], dateRange?: { from?: Date; to?: Date }, subIdFilter?: string) => {
  const map = new Map<string, { commission: number; cost: number; profit: number }>();
  
  // Process rows for commission (already filtered by dateRange in Dashboard.tsx)
  rows.forEach((r) => {
    // Calculate mes_ano from date if not present
    let key = r.mes_ano;
    if (!key && r.date) {
      const date = parseDateOnly(r.date);
      if (date && !isNaN(date.getTime())) {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
    }
    if (!key) key = "Sem Mês";
    
    const prev = map.get(key) || { commission: 0, cost: 0, profit: 0 };
    const comissao = getAffiliateCommissionValue(r);
    map.set(key, {
      ...prev,
      commission: prev.commission + comissao,
    });
  });
  
  // Process ad spends for cost - filter by dateRange and subIdFilter to match cards (same logic as calcTotals)
  adSpends.forEach((spend) => {
    if (!spend.date) return;
    
    // Filter by subIdFilter (same logic as calcTotals)
    if (subIdFilter && spend.sub_id !== subIdFilter) return;
    
    // Filter by dateRange (same logic as calcTotals)
    const spendDate = toDateKey(spend.date);
    if (dateRange?.from && spendDate < toDateKey(dateRange.from)) return;
    if (dateRange?.to && spendDate > toDateKey(dateRange.to)) return;
    
    const date = parseDateOnly(spend.date);
    const key = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "Sem Mês";
    const prev = map.get(key) || { commission: 0, cost: 0, profit: 0 };
    map.set(key, {
      ...prev,
      cost: prev.cost + (spend.amount || 0),
    });
  });
  
  // Calculate profit for each month
  return Array.from(map.entries())
    .map(([mes_ano, v]) => ({ 
      mes_ano, 
      commission: v.commission,
      cost: v.cost,
      profit: v.commission - v.cost
    }))
    .sort((a, b) => a.mes_ano.localeCompare(b.mes_ano));
};

const groupByPlatform = (rows: DatasetRow[], dateRange?: { from?: Date; to?: Date }) => {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    // Skip if no date
    if (!r.date) return;
    
    // Filter by dateRange
    if (dateRange?.from && isBeforeDateKey(r.date, dateRange.from)) return;
    if (dateRange?.to && isAfterDateKey(r.date, dateRange.to)) return;
    
    const key = r.platform || "Outros";
    map.set(key, (map.get(key) || 0) + getAffiliateCommissionValue(r));
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

const groupByCategory = (rows: DatasetRow[], dateRange?: { from?: Date; to?: Date }) => {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    // Skip if no date
    if (!r.date) return;
    
    // Filter by dateRange
    if (dateRange?.from && isBeforeDateKey(r.date, dateRange.from)) return;
    if (dateRange?.to && isAfterDateKey(r.date, dateRange.to)) return;
    
    const key = r.category || "Sem categoria";
    map.set(key, (map.get(key) || 0) + getAffiliateCommissionValue(r));
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
};

const chartContainerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const chartItemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
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
    <motion.div
      variants={chartItemVariants}
      initial="hidden"
      animate="show"
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-card rounded-xl border border-border p-6"
      role="region"
      aria-label="Gráfico de comissão por canal"
    >
      <div className="mb-4">
        <h3 className="font-display font-semibold text-lg text-foreground">
          Comissão Pendente + Concluída por Canal
        </h3>
        <p className="text-sm text-muted-foreground">Distribuição percentual</p>
      </div>
    <div className="h-80 sm:h-96 flex items-center justify-center overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={280}>
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
                <Cell
                  key={`cell-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                  stroke="transparent"
                  style={{
                    transition: "opacity 0.3s ease, transform 0.2s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.8";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                ...tooltipStyle,
                transition: "opacity 0.2s ease, transform 0.2s ease",
                animation: "fade-in 0.2s ease-out",
              }}
              cursor={tooltipCursor}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => {
                const percent = total ? (value / total) * 100 : 0;
                return [`${formatCurrency(value)} (${percent.toFixed(2)}%)`, "Valor"];
              }}
              labelFormatter={(label) => (label ? String(label) : "Canal")}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        {pieData.map((item, index) => {
          const percent = total ? (item.value / total) * 100 : 0;
          return (
            <div key={item.name} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
              <span className="text-muted-foreground truncate">{item.name}</span>
              <span className="font-medium text-foreground ml-auto flex-shrink-0">{percent.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const CategoryBarChart = ({
  data,
  onDrillDown,
}: {
  data: any[];
  onDrillDown?: (value: string) => void;
}) => (
  <motion.div
    variants={chartItemVariants}
    initial="hidden"
    animate="show"
    whileHover={{ scale: 1.01 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className="bg-card rounded-xl border border-border p-6"
    role="region"
    aria-label="Gráfico de comissão por categoria"
  >
    <div className="mb-4">
      <h3 className="font-display font-semibold text-lg text-foreground">
        Comissão Pendente + Concluída por Categoria
      </h3>
      <p className="text-sm text-muted-foreground">Top 12 categorias</p>
    </div>
    <div className="h-96 overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={320}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 24, right: 20, left: 80, bottom: 16 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={false} tickLine={false} axisLine={false} />
          <YAxis
            dataKey="name"
            type="category"
            width={80}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              ...tooltipStyle,
              transition: "opacity 0.2s ease, transform 0.2s ease",
              animation: "fade-in 0.2s ease-out",
            }}
            cursor={tooltipCursor}
            formatter={(v: number) => [formatK(v), "Valor"]}
          />
          <Bar
            dataKey="value"
            fill={BAR_COLOR}
            radius={[0, 8, 8, 0]}
            cursor="pointer"
            onClick={(d) => onDrillDown?.(d.name)}
            style={{
              transition: "opacity 0.3s ease",
            }}
            onMouseEnter={(e) => {
              if (e?.target) {
                (e.target as SVGElement).style.opacity = "0.8";
              }
            }}
            onMouseLeave={(e) => {
              if (e?.target) {
                (e.target as SVGElement).style.opacity = "1";
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
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
  <motion.div
    variants={chartItemVariants}
    initial="hidden"
    animate="show"
    whileHover={{ scale: 1.01 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className="bg-card rounded-xl border border-border p-6"
    role="region"
    aria-label="Gráfico de comissão por período"
  >
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h3 className="font-display font-semibold text-lg text-foreground">
          Comissão Pendente + Concluída
        </h3>
        <p className="text-sm text-muted-foreground">
          {mode === "month" ? "Soma das comissões por mês" : "Soma das comissões por dia"}
        </p>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2"
        >
          <Button
            size="sm"
            variant={mode === "month" ? "default" : "outline"}
            onClick={() => onModeChange("month")}
            aria-pressed={mode === "month"}
            aria-label="Visualizar por mês"
          >
            Mês
          </Button>
          <Button
            size="sm"
            variant={mode === "day" ? "default" : "outline"}
            onClick={() => onModeChange("day")}
            aria-pressed={mode === "day"}
            aria-label="Visualizar por dia"
          >
            Dia
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
    <div className="h-80 sm:h-96 overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={280}>
        <BarChart data={data} margin={{ top: 30, right: 10, left: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="label" 
            stroke="hsl(var(--muted-foreground))" 
            tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" tick={false} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              ...tooltipStyle,
              transition: "opacity 0.2s ease, transform 0.2s ease",
              animation: "fade-in 0.2s ease-out",
            }}
            cursor={tooltipCursor}
            formatter={(v: number) => [formatK(v), "Valor"]}
            labelFormatter={(l) => `Período ${l}`}
          />
          <Bar
            dataKey="value"
            fill={BAR_COLOR}
            radius={[8, 8, 0, 0]}
            cursor="pointer"
            onClick={(d) => onDrillDown?.(d.key)}
            style={{
              transition: "opacity 0.3s ease",
            }}
            onMouseEnter={(e) => {
              if (e?.target) {
                (e.target as SVGElement).style.opacity = "0.8";
              }
            }}
            onMouseLeave={(e) => {
              if (e?.target) {
                (e.target as SVGElement).style.opacity = "1";
              }
            }}
          >
            <LabelList dataKey="value" position="top" formatter={(v: number) => formatK(v)} fill="hsl(var(--foreground))" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
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
    <motion.div
      variants={chartItemVariants}
      initial="hidden"
      animate="show"
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-card rounded-xl border border-border p-6"
      role="region"
      aria-label="Gráfico de comissão, gastos e lucro"
    >
      <div className="mb-4">
        <h3 className="font-display font-semibold text-lg text-foreground">Comissão x Valor Gasto em Ads x Lucro</h3>
        <p className="text-sm text-muted-foreground">{periodLabel}</p>
      </div>
    <div className="h-80 sm:h-96 overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={320}>
        <AreaChart
          data={data}
          margin={{ top: 30, right: 20, left: 0, bottom: 0 }}
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
          <XAxis 
            dataKey="mes_ano" 
            stroke="hsl(var(--muted-foreground))" 
            tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
            tickLine={false}
            tickFormatter={(value) => {
              if (typeof value === "string" && value.length >= 7) {
                const [year, month] = value.split("-");
                if (year && month) return `${month}/${year}`;
              }
              return value;
            }}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={formatK} axisLine={false} tickLine={false} hide />
          <Tooltip
            contentStyle={{
              ...tooltipStyle,
              transition: "opacity 0.2s ease, transform 0.2s ease",
              animation: "fade-in 0.2s ease-out",
            }}
            cursor={tooltipCursor}
            formatter={(v: number, _name: string, ctx) => {
              const key = ctx?.dataKey;
              const label =
                key === "commission"
                  ? "Comissão"
                  : key === "profit"
                  ? "Lucro"
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
            dataKey="commission"
            name="Comissão"
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
            name="Lucro"
            stroke={PROFIT_COLOR}
            fillOpacity={1}
            fill="url(#prof)"
            cursor="pointer"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    </motion.div>
  );
};

const DashboardCharts = ({ rows, adSpends = [], dateRange, subIdFilter, onDrillDown, belowRevenueContent }: DashboardChartsProps) => {
  const [commissionMode, setCommissionMode] = useState<"month" | "day">("month");

  if (!rows.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-6"
        role="status"
        aria-live="polite"
      >
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-muted-foreground text-sm mb-2">Nenhum dado disponível</p>
          <p className="text-xs text-muted-foreground/70">
            Faça o upload de um CSV para visualizar gráficos e análises.
          </p>
        </div>
      </motion.div>
    );
  }

  const mesAnoData = groupByMesAno(rows, dateRange);
  const commissionDayData = groupCommissionByDay(rows, dateRange);
  const revProfitData = groupRevenueProfitByMes(rows, adSpends, dateRange, subIdFilter);
  const channelData = groupByPlatform(rows, dateRange);
  const categoryData = groupByCategory(rows, dateRange);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-6 mt-6"
    >
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
    </motion.div>
  );
};

export default DashboardCharts;
