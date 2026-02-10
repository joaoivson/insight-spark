import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { ChartTooltip, ChartTooltipContent, ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { formatCurrency } from "../../../shared/lib/chart-utils";

// Paleta da imagem: azul, teal (verde-água), laranja
const BAR_COLORS = [
  "hsl(210, 80%, 55%)",  // azul
  "hsl(173, 80%, 40%)",  // teal / verde-água
  "hsl(38, 92%, 50%)",   // laranja
];

interface ChannelPieChartProps {
  data: any[];
  onDrillDown?: (value: string) => void;
  variants: any;
}

export const ChannelPieChart = ({ data, onDrillDown, variants }: ChannelPieChartProps) => {
  const chartData = useMemo(
    () =>
      data.slice(0, 6).map((item, index) => ({
        ...item,
        fill: BAR_COLORS[index % BAR_COLORS.length],
        nameKey: item.name.replace(/\s+/g, "_"),
      })),
    [data],
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = { value: { label: "Comissão" } };
    chartData.forEach((item) => {
      config[item.nameKey] = { label: item.name, color: item.fill };
    });
    return config;
  }, [chartData]);

  const barHeight = useMemo(() => {
    const count = chartData.length;
    return Math.max(32, Math.min(56, 320 / count));
  }, [chartData.length]);

  return (
    <motion.div variants={variants} initial="hidden" animate="show" whileHover={{ scale: 1.01 }} className="h-full min-w-0">
      <Card className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-xl border border-border">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-lg font-semibold">Comissão por Canal</CardTitle>
          <CardDescription>Distribuição de ganhos</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col pt-0">
          <ChartContainer
            config={chartConfig}
            className="h-full w-full min-h-[280px] [&_.recharts-responsive-container]:overflow-visible [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible [&_.recharts-rectangle]:opacity-90 [&_.recharts-rectangle]:transition-opacity [&_.recharts-rectangle]:duration-200 [&_.recharts-rectangle:hover]:opacity-100"
          >
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 8, right: 72, left: 8, bottom: 8 }}
              barSize={barHeight}
              barCategoryGap="12%"
              barGap={4}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel formatter={(v, name) => (
                <span className="flex justify-between items-center gap-4 w-full min-w-[140px]">
                  <span className="text-muted-foreground">{(name === "value" || !name) ? "Comissão" : name}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(Number(v))}</span>
                </span>
              )} />}
              />
              <Bar
                dataKey="value"
                nameKey="name"
                radius={[0, 4, 4, 0]}
                cursor={onDrillDown ? "pointer" : undefined}
                {...(onDrillDown && { onClick: (d: { name?: string }) => d?.name && onDrillDown(d.name) })}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => formatCurrency(v)}
                  className="fill-foreground text-xs font-medium"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
};
