import { useMemo, useState } from "react";
import { ClickRow } from "@/services/clicks.service";
import { AdSpend } from "@/shared/types/adspend";
import { 
  MousePointerClick, 
  Share2, 
  Tag, 
  Instagram,
  Facebook,
  Link2,
  Calendar,
  ArrowUpDown,
  BarChart3,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, normalizeSubId } from "@/shared/lib/utils";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  LabelList,
  AreaChart,
  Area,
  Label
} from "recharts";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { isBeforeDateKey, isAfterDateKey, toDateKey } from "@/shared/lib/date";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const PIE_COLORS = [
  "hsl(210, 80%, 55%)", // Blue
  "hsl(173, 80%, 40%)", // Teal/Success
  "hsl(38, 92%, 50%)",  // Orange/Warning
  "hsl(273, 65%, 60%)", // Purple
  "hsl(340, 75%, 55%)", // Pink
  "hsl(222, 47%, 25%)", // Navy
];

const BAR_COLOR = "hsl(210, 80%, 55%)";

const chartItemVariants: Variants = {
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

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  color: "hsl(var(--foreground))",
  borderRadius: "8px",
  fontSize: "12px",
};

const tooltipCursor = { fill: "transparent" };

const formatK = (value: number) => {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} Mil`;
  return value.toLocaleString("pt-BR");
};

// API pode enviar ISO (YYYY-MM-DD) ou YYYY-DD-MM. Detecta e normaliza para ISO.
const normalizeDate = (dateStr?: string | null): string => {
  if (!dateStr || dateStr === "Sem data") return "Sem data";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, a, b] = parts;
  const na = Number(a);
  const nb = Number(b);
  // Se o segundo segmento é 01-12, assume ISO (YYYY-MM-DD) e mantém como está
  if (na >= 1 && na <= 12 && nb >= 1 && nb <= 31) return dateStr;
  // Caso contrário assume YYYY-DD-MM: segundo = dia, terceiro = mês
  const day = a.padStart(2, "0");
  const month = b.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface DashboardClicksProps {
  clicks: ClickRow[];
  adSpends?: AdSpend[];
  dateRange?: { from?: Date; to?: Date };
  subIdFilter?: string;
}

const DashboardClicks = ({ clicks: rawClicks, adSpends = [], dateRange, subIdFilter }: DashboardClicksProps) => {
  // Normaliza as datas estranhas da API (YYYY-DD-MM -> YYYY-MM-DD) antes de qualquer processamento
  const clicks = useMemo(() => rawClicks.map(c => ({
    ...c,
    date: normalizeDate(c.date)
  })), [rawClicks]);

  // 1. Estados sempre no topo
  const [dayPage, setDayPage] = useState(0);
  const [dayPageSize, setDayPageSize] = useState(10);
  const [daySortDirection, setDaySortDirection] = useState<"asc" | "desc">("desc");
  const [compSortColumn, setCompSortColumn] = useState<string>("total");
  const [compSortDirection, setCompSortDirection] = useState<"asc" | "desc">("desc");
  const [pieActiveIndex, setPieActiveIndex] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<"day" | "month">("day");

  // 2. Helpers
  const getItemClicks = (item: ClickRow): number => {
    return Number(item.clicks) || 0;
  };

  // 3. Cálculos Memorizados
  const totalClicks = useMemo(() => 
    clicks.reduce((acc, curr) => acc + getItemClicks(curr), 0), 
  [clicks]);

  // Comparação: Cliques Manuais (Ads) vs Cliques CSV por Sub ID
  const comparisonStats = useMemo(() => {
    const csvStats = clicks.reduce((acc, item) => {
      const subId = normalizeSubId(item.sub_id);
      acc[subId] = (acc[subId] || 0) + getItemClicks(item);
      return acc;
    }, {} as Record<string, number>);

    const adsStats = adSpends.reduce((acc, item) => {
      if (!item.date) return acc;
      
      // Filter by subIdFilter
      if (subIdFilter && normalizeSubId(item.sub_id || "Geral") !== normalizeSubId(subIdFilter)) return acc;
      
      // Filter by dateRange
      const itemDateKey = toDateKey(item.date);
      if (dateRange?.from && itemDateKey < toDateKey(dateRange.from)) return acc;
      if (dateRange?.to && itemDateKey > toDateKey(dateRange.to)) return acc;

      const subId = normalizeSubId(item.sub_id || "Geral");
      acc[subId] = (acc[subId] || 0) + (item.clicks || 0);
      return acc;
    }, {} as Record<string, number>);

    const allSubIds = Array.from(new Set([...Object.keys(csvStats), ...Object.keys(adsStats)]));

    let data = allSubIds.map(subId => {
      const csvClicks = csvStats[subId] || 0;
      const adsClicks = adsStats[subId] || 0;
      const diff = csvClicks - adsClicks;
      const diffPercent = csvClicks > 0 ? ((csvClicks - adsClicks) / adsClicks) * 100 : 0;

      return {
        subId,
        csvClicks,
        adsClicks,
        diff,
        diffPercent,
        total: csvClicks + adsClicks
      };
    });

    // Ordenação dinâmica
    data.sort((a, b) => {
      const factor = compSortDirection === "asc" ? 1 : -1;
      const valA = (a as any)[compSortColumn];
      const valB = (b as any)[compSortColumn];
      
      if (typeof valA === "string") {
        return valA.localeCompare(valB) * factor;
      }
      return (valA - valB) * factor;
    });

    return data;
  }, [clicks, adSpends, compSortColumn, compSortDirection]);

  const channelStats = useMemo(() => {
    const stats = clicks.reduce((acc, item) => {
      const channel = (item.channel || "Others").trim();
      acc[channel] = (acc[channel] || 0) + getItemClicks(item);
      return acc;
    }, {} as Record<string, number>);

    const sortedEntries = Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (sortedEntries.length <= 6) {
      return sortedEntries.map(item => ({
        ...item,
        percentage: totalClicks > 0 ? (item.value / totalClicks) * 100 : 0,
      }));
    }

    const top5 = sortedEntries.slice(0, 5);
    const othersValue = sortedEntries.slice(5).reduce((sum, item) => sum + item.value, 0);
    
    const finalData = [
      ...top5,
      { name: "Outros", value: othersValue }
    ];

    return finalData.map(item => ({
      ...item,
      percentage: totalClicks > 0 ? (item.value / totalClicks) * 100 : 0,
    }));
  }, [clicks, totalClicks]);

  const formatDateLabelDDMM = (dateStr: string): string => {
    if (!dateStr || dateStr === "Sem data") return dateStr;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    if (year.length === 4 && Number(year) > 1900) {
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}`;
    }
    return dateStr;
  };

  const formatMonthLabelMMYYYY = (monthKey: string): string => {
    const [y, m] = monthKey.split("-");
    if (y && m) return `${m}/${y}`;
    return monthKey;
  };

  const dailyStats = useMemo(() => {
    const stats = clicks.reduce((acc, item) => {
      const day = item.date || "Sem data";
      if (dateRange?.from && day !== "Sem data" && day < toDateKey(dateRange.from)) return acc;
      if (dateRange?.to && day !== "Sem data" && day > toDateKey(dateRange.to)) return acc;
      acc[day] = (acc[day] || 0) + getItemClicks(item);
      return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(stats).map(([day, count]) => ({
      day,
      label: formatDateLabelDDMM(day),
      value: count,
    }));

    data.sort((a, b) => a.day.localeCompare(b.day));
    return data;
  }, [clicks, dateRange]);

  const monthlyStats = useMemo(() => {
    const stats = clicks.reduce((acc, item) => {
      if (!item.date || item.date === "Sem data") return acc;
      const parts = item.date.split("-");
      if (parts.length !== 3) return acc;
      const year = parts[0];
      // API de cliques pode enviar YYYY-DD-MM (dia no meio): 2026-01-01 = 1º jan, 2026-07-01 = 7 jan
      // Se o terceiro segmento for 01-12, é o mês; senão usamos o segundo (ISO YYYY-MM-DD)
      const month = parts[2] >= "01" && parts[2] <= "12" ? parts[2] : parts[1];
      const key = `${year}-${month}`;
      acc[key] = (acc[key] || 0) + getItemClicks(item);
      return acc;
    }, {} as Record<string, number>);

    let data = Object.entries(stats).map(([monthKey, count]) => ({
      monthKey,
      label: formatMonthLabelMMYYYY(monthKey),
      value: count,
    }));

    if (dateRange?.from || dateRange?.to) {
      const fromKey = dateRange.from ? toDateKey(dateRange.from).slice(0, 7) : null;
      const toKey = dateRange.to ? toDateKey(dateRange.to).slice(0, 7) : null;
      data = data.filter(({ monthKey }) => {
        if (fromKey && monthKey < fromKey) return false;
        if (toKey && monthKey > toKey) return false;
        return true;
      });
    }

    data.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    return data;
  }, [clicks, dateRange]);

  const chartData = chartMode === "day" ? dailyStats : monthlyStats;

  const chartMinWidth = useMemo(() => {
    if (chartMode === "month") return 300;
    return Math.max(300, chartData.length * 35);
  }, [chartData.length, chartMode]);

  const handleCompSort = (column: string) => {
    if (compSortColumn === column) {
      setCompSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setCompSortColumn(column);
      setCompSortDirection("desc");
    }
  };

  const getChannelIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("instagram")) return <Instagram className="w-4 h-4 mr-2" />;
    if (lower.includes("facebook")) return <Facebook className="w-4 h-4 mr-2" />;
    return <Link2 className="w-4 h-4 mr-2" />;
  };

  if (!clicks.length) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Total Clicks KPI */}
      <div className="flex justify-center">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
          <div className="relative bg-card/60 border border-accent/20 backdrop-blur-md rounded-2xl px-10 py-5 flex items-center gap-6 shadow-2xl shadow-black/20 ring-1 ring-white/5">
            <div className="p-3 bg-accent/10 rounded-xl border border-accent/20">
              <MousePointerClick className="w-8 h-8 text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">Volume Total de Cliques</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-display font-black text-foreground tracking-tight">
                  {totalClicks.toLocaleString("pt-BR")}
                </span>
                <span className="text-accent text-sm font-semibold">cliques registrados</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PIE CHART: Cliques por Canal */}
        <motion.div
          variants={chartItemVariants}
          initial="hidden"
          animate="show"
          className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col"
        >
          <div className="mb-4">
            <h3 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
              <Share2 className="w-4 h-4 text-accent" />
              Cliques por Canal
            </h3>
            <p className="text-sm text-muted-foreground">Distribuição de tráfego</p>
          </div>
          
          <div className="flex-1 min-h-[400px] overflow-visible">
            <ChartContainer
              config={useMemo(() => {
                const config: ChartConfig = {
                  value: { label: "Cliques" }
                };
                channelStats.forEach((item, index) => {
                  config[item.name.replace(/\s+/g, "_")] = {
                    label: item.name,
                    color: PIE_COLORS[index % PIE_COLORS.length],
                  };
                });
                return config;
              }, [channelStats])}
              className="mx-auto aspect-square max-h-[450px] w-full overflow-visible [&_.recharts-responsive-container]:overflow-visible [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible"
            >
              <PieChart margin={{ top: 20, right: 160, left: 160, bottom: 20 }}>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={channelStats.map((item, index) => ({
                    ...item,
                    fill: PIE_COLORS[index % PIE_COLORS.length]
                  }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={90}
                  outerRadius={125}
                  strokeWidth={8}
                  stroke="hsl(var(--card))"
                  paddingAngle={2}
                  onMouseEnter={(_, index) => setPieActiveIndex(index)}
                  onMouseLeave={() => setPieActiveIndex(null)}
                  label={({ cx, cy, midAngle, outerRadius, fill, percent, name }) => {
                    const RADIAN = Math.PI / 180;
                    const sin = Math.sin(-RADIAN * midAngle);
                    const cos = Math.cos(-RADIAN * midAngle);
                    const sx = cx + (outerRadius + 5) * cos;
                    const sy = cy + (outerRadius + 5) * sin;
                    const mx = cx + (outerRadius + 25) * cos;
                    const my = cy + (outerRadius + 25) * sin;
                    const ex = mx + (cos >= 0 ? 1 : -1) * 20;
                    const ey = my;
                    
                    return (
                      <g>
                        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={2} />
                        <circle cx={ex} cy={ey} r={3} fill={fill} stroke="none" />
                        <foreignObject
                          x={ex + (cos >= 0 ? 8 : -118)}
                          y={ey - 30}
                          width="110"
                          height="60"
                        >
                          <div 
                            className="flex flex-col justify-center px-4 h-full rounded-2xl border-2 bg-card/95 shadow-xl"
                            style={{ borderColor: fill }}
                          >
                            <span className="text-[10px] font-bold text-muted-foreground uppercase truncate leading-tight">
                              {name}
                            </span>
                            <span className="text-xl font-black text-foreground leading-none mt-1">
                              {(percent * 100).toFixed(0)}%
                            </span>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  }}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        const topPerformer = channelStats.reduce((max, curr) => (curr.value > max.value ? curr : max), channelStats[0]);
                        const activeItem = pieActiveIndex !== null ? channelStats[pieActiveIndex] : topPerformer;
                        const activeColor = PIE_COLORS[channelStats.indexOf(activeItem) % PIE_COLORS.length];
                        
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 12}
                              className="fill-muted-foreground text-[10px] uppercase font-bold tracking-wider"
                            >
                              {pieActiveIndex !== null ? "Canal Focado" : "Principal"}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 10}
                              className="text-lg font-black transition-colors duration-300"
                              style={{ fill: activeColor }}
                            >
                              {activeItem?.name}
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            {channelStats.map((item, index) => (
              <div 
                key={item.name} 
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg transition-colors",
                  pieActiveIndex === index ? "bg-accent/10 ring-1 ring-accent/20" : "bg-secondary/5"
                )}
              >
                <div 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-muted-foreground truncate font-medium">
                    {item.name}
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {item.value.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* BAR CHART: Cliques por Dia/Mês - mesmo layout do gráfico Comissão */}
        <motion.div
          variants={chartItemVariants}
          initial="hidden"
          animate="show"
          whileHover={{ scale: 1.01 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">Cliques por Dia e Mês</h3>
              <p className="text-sm text-muted-foreground">
                {chartMode === "month" ? "Soma dos cliques por mês" : "Soma dos cliques por dia"}
              </p>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={chartMode} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} className="flex items-center gap-2">
                <Button size="sm" variant={chartMode === "month" ? "default" : "outline"} onClick={() => setChartMode("month")}>Mês</Button>
                <Button size="sm" variant={chartMode === "day" ? "default" : "outline"} onClick={() => setChartMode("day")}>Dia</Button>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="h-80 sm:h-96 overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-thin scrollbar-thumb-accent/20">
            <ChartContainer
              config={{
                value: {
                  label: "Cliques",
                  color: BAR_COLOR,
                },
              }}
              className="h-full w-full"
              style={{ minWidth: chartMinWidth }}
            >
              <BarChart
                key={chartMode}
                accessibilityLayer
                data={chartData}
                margin={{ top: 30, right: 10, left: 10, bottom: 40 }}
                barCategoryGap={chartMode === "month" ? (chartData.length === 1 ? "5%" : 18) : "10%"}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  angle={chartMode === "month" && chartData.length <= 6 ? 0 : -45}
                  textAnchor={chartMode === "month" && chartData.length <= 6 ? "middle" : "end"}
                  height={60}
                  interval={chartMode === "day" && chartData.length > 30 ? "preserveStartEnd" : 0}
                  tick={{ fontSize: 14 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar
                  dataKey="value"
                  fill="var(--color-value)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={chartMode === "month" ? (chartData.length === 1 ? 400 : 120) : 50}
                >
                  {chartData.length <= 20 && (
                    <LabelList 
                      dataKey="value" 
                      position="top" 
                      formatter={(v: number) => formatK(v)} 
                      fill="hsl(var(--foreground))" 
                      fontSize={14}
                      offset={10}
                    />
                  )}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </motion.div>
      </div>

      {/* Comparison: Ads vs CSV */}
      <motion.div 
        variants={chartItemVariants}
        initial="hidden"
        animate="show"
        className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      >
        <div className="p-4 border-b border-border bg-secondary/5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider">Comparativo: Anúncios vs Shopee (por Sub ID)</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="w-[200px]">
                <button onClick={() => handleCompSort("subId")} className="flex items-center gap-1 hover:text-foreground transition-colors text-xs font-bold uppercase tracking-wider">
                  Sub ID <ArrowUpDown className="w-3 h-3" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button onClick={() => handleCompSort("adsClicks")} className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto text-xs font-bold uppercase tracking-wider">
                  Cliques Anúncios <ArrowUpDown className="w-3 h-3" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button onClick={() => handleCompSort("csvClicks")} className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto text-xs font-bold uppercase tracking-wider">
                  Cliques Shopee <ArrowUpDown className="w-3 h-3" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button onClick={() => handleCompSort("diff")} className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto text-xs font-bold uppercase tracking-wider">
                  Diferença <ArrowUpDown className="w-3 h-3" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button onClick={() => handleCompSort("diffPercent")} className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto text-xs font-bold uppercase tracking-wider">
                  % Dif. <ArrowUpDown className="w-3 h-3" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonStats.map((item) => (
              <TableRow key={item.subId} className="hover:bg-secondary/20 border-border/50 transition-colors">
                <TableCell className="font-medium py-4">{item.subId}</TableCell>
                <TableCell className="text-right font-mono py-4">{item.adsClicks.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right font-mono py-4">{item.csvClicks.toLocaleString("pt-BR")}</TableCell>
                <TableCell className={cn(
                  "text-right font-mono py-4 font-bold",
                  item.diff > 0 ? "text-success" : item.diff < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {item.diff > 0 ? "+" : ""}{item.diff.toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className={cn(
                  "text-right text-xs py-4 font-medium",
                  item.diff > 0 ? "text-success" : item.diff < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {item.diffPercent > 0 ? "+" : ""}{item.diffPercent.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
            {comparisonStats.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                  Nenhum dado para comparação disponível.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
};

export default DashboardClicks;
