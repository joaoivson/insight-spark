"use client";

import { useState } from "react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

const BAR_COLOR = "hsl(210, 80%, 55%)";

interface CategoryBarChartProps {
  data: any[];
  onDrillDown?: (value: string) => void;
  variants: any;
}

const MAX_CATEGORY_LABEL_LEN = 22;

export const CategoryBarChart = ({ data, onDrillDown, variants }: CategoryBarChartProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartConfig = {
    value: { label: "Comissão", color: BAR_COLOR },
  } satisfies ChartConfig;

  const formatTick = (name: string) => {
    if (!name || name.length <= MAX_CATEGORY_LABEL_LEN) return name;
    return name.slice(0, MAX_CATEGORY_LABEL_LEN - 1).trim() + "…";
  };

  return (
    <motion.div variants={variants} initial="hidden" animate="show" whileHover={{ scale: 1.01 }} className="h-full min-w-0">
      <Card className="flex h-full min-h-[480px] flex-col overflow-hidden">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-lg font-semibold">Comissão por Categoria</CardTitle>
          <CardDescription>Top 12 categorias</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col pt-0 pb-4">
          <ChartContainer config={chartConfig} className="h-[420px] w-full" style={{ minWidth: 320 }}>
            <BarChart
              accessibilityLayer
              data={data}
              layout="vertical"
              margin={{ left: 130, right: 12, top: 12, bottom: 12 }}
            >
              <XAxis type="number" dataKey="value" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={130}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={formatTick}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[0, 5, 5, 0]}
                cursor={onDrillDown ? "pointer" : undefined}
                {...(onDrillDown && { onClick: (d: any) => onDrillDown(d.name) })}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill="var(--color-value)"
                    style={{
                      filter: activeIndex === index ? `drop-shadow(0 0 6px ${BAR_COLOR})` : "none",
                      transition: "all 0.2s ease",
                      opacity: activeIndex === null || activeIndex === index ? 1 : 0.6,
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
};
