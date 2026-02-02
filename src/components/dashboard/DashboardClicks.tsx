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
  LabelList
} from "recharts";
import { motion, AnimatePresence, Variants } from "framer-motion";

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
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString("pt-BR");
};

interface DashboardClicksProps {
  clicks: ClickRow[];
  adSpends?: AdSpend[];
}

const DashboardClicks = ({ clicks, adSpends = [] }: DashboardClicksProps) => {
  // 1. Estados sempre no topo
  const [dayPage, setDayPage] = useState(0);
  const [dayPageSize, setDayPageSize] = useState(10);
  const [daySortDirection, setDaySortDirection] = useState<"asc" | "desc">("desc");
  const [compSortColumn, setCompSortColumn] = useState<string>("total");
  const [compSortDirection, setCompSortDirection] = useState<"asc" | "desc">("desc");
  const [pieActiveIndex, setPieActiveIndex] = useState<number | null>(null);

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
      const subId = normalizeSubId(item.sub_id || "Geral");
      acc[subId] = (acc[subId] || 0) + (item.clicks || 0);
      return acc;
    }, {} as Record<string, number>);

    const allSubIds = Array.from(new Set([...Object.keys(csvStats), ...Object.keys(adsStats)]));

    let data = allSubIds.map(subId => {
      const csvClicks = csvStats[subId] || 0;
      const adsClicks = adsStats[subId] || 0;
      const diff = csvClicks - adsClicks;
      const diffPercent = csvClicks > 0 ? (diff / csvClicks) * 100 : 0;

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

  // API envia date como DD-MM-YYYY na string "YYYY-MM-DD" (ex: "2025-07-11" = 07/11/2025)
  const formatDateLabelDDMM = (dateStr: string): string => {
    if (!dateStr || dateStr === "Sem data") return dateStr;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [year, day, month] = parts;
    if (year.length === 4 && Number(year) > 1900) {
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}`;
    }
    return dateStr;
  };

  const dailyStats = useMemo(() => {
    const stats = clicks.reduce((acc, item) => {
      const day = item.date || "Sem data";
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
  }, [clicks]);

  const chartMinWidth = useMemo(() => {
    return Math.max(300, dailyStats.length * 35);
  }, [dailyStats]);

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
        <div className="bg-card/50 border border-accent/20 rounded-full px-8 py-3 flex items-center gap-3 shadow-lg shadow-black/10">
          <span className="text-foreground font-display font-bold text-xl whitespace-nowrap">
            Total de Cliques: <span className="text-accent">{totalClicks.toLocaleString("pt-BR")}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PIE CHART: Cliques por Canal */}
        <motion.div
          variants={chartItemVariants}
          initial="hidden"
          animate="show"
          className="bg-card rounded-xl border border-border p-6 shadow-sm"
        >
          <div className="mb-6 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-accent" />
            <h3 className="font-display font-semibold text-lg text-foreground">
              Cliques por Canal
            </h3>
          </div>
          <div className="h-80 sm:h-96 flex items-center justify-center -mx-2 sm:mx-0 px-2 sm:px-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={channelStats}
                  cx="50%"
                  cy="45%"
                  innerRadius="60%"
                  outerRadius="85%"
                  paddingAngle={5}
                  dataKey="value"
                  cursor="pointer"
                  stroke="none"
                  onMouseEnter={(_, index) => setPieActiveIndex(index)}
                  onMouseLeave={() => setPieActiveIndex(null)}
                  animationBegin={200}
                  animationDuration={1200}
                >
                  {channelStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                      style={{
                        filter: pieActiveIndex === index ? `drop-shadow(0px 0px 8px ${PIE_COLORS[index % PIE_COLORS.length]})` : 'none',
                        transition: 'all 0.3s ease'
                      }}
                      className="transition-all duration-300"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  cursor={tooltipCursor}
                  formatter={(value: number) => {
                    const percent = totalClicks ? (value / totalClicks) * 100 : 0;
                    return [`${value.toLocaleString("pt-BR")} (${percent.toFixed(2)}%)`, "Cliques"];
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "20px" }}
                  formatter={(value) => {
                    const item = channelStats.find(d => d.name === value);
                    const percent = totalClicks && item ? (item.value / totalClicks) * 100 : 0;
                    return (
                      <span className="text-[10px] sm:text-xs font-medium text-foreground">
                        {value} <span className="text-muted-foreground ml-1">({percent.toFixed(1)}%)</span>
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* BAR CHART: Cliques por Dia */}
        <motion.div
          variants={chartItemVariants}
          initial="hidden"
          animate="show"
          className="bg-card rounded-xl border border-border p-6 shadow-sm"
        >
          <div className="mb-6 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            <h3 className="font-display font-semibold text-lg text-foreground">
              Cliques por Dia
            </h3>
          </div>
          <div className="h-80 sm:h-96 overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-thin scrollbar-thumb-accent/20">
            <ResponsiveContainer width={dailyStats.length > 10 ? undefined : "100%"} height="100%" minWidth={chartMinWidth}>
              <BarChart data={dailyStats} margin={{ top: 30, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="hsl(var(--muted-foreground))" 
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={dailyStats.length > 30 ? "preserveStartEnd" : 0}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  cursor={{ fill: "hsl(var(--accent)/0.05)" }}
                  formatter={(v: number) => [v.toLocaleString("pt-BR"), "Cliques"]}
                />
                <Bar
                  dataKey="value"
                  fill={BAR_COLOR}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                >
                  {dailyStats.length <= 20 && (
                    <LabelList 
                      dataKey="value" 
                      position="top" 
                      formatter={(v: number) => formatK(v)} 
                      fill="hsl(var(--foreground))" 
                      fontSize={10}
                      offset={10}
                    />
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
