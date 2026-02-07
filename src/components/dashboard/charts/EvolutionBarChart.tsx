import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import { ChartTooltip, ChartTooltipContent, ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatK, formatCurrency } from "../../../shared/lib/chart-utils";

const BAR_COLOR = "hsl(210, 80%, 55%)";

interface EvolutionBarChartProps {
  data: any[];
  mode: "month" | "day";
  onModeChange: (mode: "month" | "day") => void;
  onDrillDown?: (value: string) => void;
  variants: any;
}

export const EvolutionBarChart = ({ data, mode, onModeChange, onDrillDown, variants }: EvolutionBarChartProps) => {
  const chartConfig = {
    value: { label: "Comissão", color: BAR_COLOR },
  } satisfies ChartConfig;

  const dynamicMinWidth = useMemo(() => {
    if (mode === "month") return 280;
    return Math.max(280, data.length * 35);
  }, [data.length, mode]);

  const showLabels = data.length <= 20;

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="show"
      whileHover={{ scale: 1.01 }}
      className="bg-card rounded-xl border border-border p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">Comissão Pendente + Concluída</h3>
          <p className="text-sm text-muted-foreground">{mode === "month" ? "Soma das comissões por mês" : "Soma das comissões por dia"}</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} className="flex items-center gap-2">
            <Button size="sm" variant={mode === "month" ? "default" : "outline"} onClick={() => onModeChange("month")}>Mês</Button>
            <Button size="sm" variant={mode === "day" ? "default" : "outline"} onClick={() => onModeChange("day")}>Dia</Button>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="h-80 sm:h-96 overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-thin scrollbar-thumb-accent/20">
        <ChartContainer config={chartConfig} className="h-full w-full" style={{ minWidth: dynamicMinWidth }}>
          <BarChart accessibilityLayer data={data} margin={{ top: 30, right: 10, left: 10, bottom: 40 }} barCategoryGap={mode === "month" ? (data.length === 1 ? "5%" : 18) : "10%"}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} angle={-45} textAnchor="end" height={60} interval={mode === "day" && data.length > 30 ? "preserveStartEnd" : 0} tick={{ fontSize: 14 }} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(v, name) => (
            <span className="flex justify-between items-center gap-4 w-full min-w-[140px]">
              <span className="text-muted-foreground">{(name === "value" || !name) ? "Comissão" : name}</span>
              <span className="font-medium tabular-nums">{formatCurrency(Number(v))}</span>
            </span>
          )} />} />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              radius={[4, 4, 0, 0]}
              maxBarSize={mode === "month" ? (data.length === 1 ? 400 : 120) : 50}
              cursor={onDrillDown ? "pointer" : undefined}
              {...(onDrillDown && { onClick: (d: any) => onDrillDown(d.key) })}
            >
              {showLabels && <LabelList dataKey="value" position="top" formatter={(v: number) => formatK(v)} fill="hsl(var(--foreground))" fontSize={14} offset={10} />}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </motion.div>
  );
};
