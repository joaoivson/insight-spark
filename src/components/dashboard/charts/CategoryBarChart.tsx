"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { formatCurrency } from "../../../shared/lib/chart-utils";

// Paleta da imagem: azul, teal (verde-água), laranja
const BAR_COLORS = [
  "hsl(210, 80%, 55%)",  // azul
  "hsl(173, 80%, 40%)",  // teal / verde-água
  "hsl(38, 92%, 50%)",   // laranja
];

interface CategoryBarChartProps {
  data: any[];
  onDrillDown?: (value: string) => void;
  variants: any;
}

const MAX_CATEGORY_LABEL_LEN = 22;

export const CategoryBarChart = ({ data, onDrillDown, variants }: CategoryBarChartProps) => {
  const formatTick = (name: string) => {
    if (!name || name.length <= MAX_CATEGORY_LABEL_LEN) return name;
    return name.slice(0, MAX_CATEGORY_LABEL_LEN - 1).trim() + "…";
  };

  const chartData = useMemo(
    () =>
      data.map((item, index) => ({
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

  const barSize = useMemo(() => {
    const count = chartData.length;
    return Math.max(28, Math.min(48, 400 / count));
  }, [chartData.length]);

  return (
    <motion.div variants={variants} initial="hidden" animate="show" whileHover={{ scale: 1.01 }} className="h-full min-w-0">
      <Card className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-xl border border-border">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-lg font-semibold">Comissão por Categoria</CardTitle>
          <CardDescription>Top 12 categorias</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col pt-0 pb-4">
          <ChartContainer
            config={chartConfig}
            className="h-[420px] w-full [&_.recharts-rectangle]:opacity-90 [&_.recharts-rectangle]:transition-opacity [&_.recharts-rectangle]:duration-200 [&_.recharts-rectangle:hover]:opacity-100"
            style={{ minWidth: 320 }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 72, left: 8, bottom: 20 }}
              barSize={barSize}
              barCategoryGap="40%"
              barGap={4}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={formatTick}
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
