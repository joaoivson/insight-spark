import { useMemo, useState } from "react";
import { Pie, PieChart, Label } from "recharts";
import { ChartTooltip, ChartTooltipContent, ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/utils";
import { formatCurrency } from "../../../shared/lib/chart-utils";

const PIE_COLORS = [
  "hsl(210, 80%, 55%)",
  "hsl(173, 80%, 40%)",
  "hsl(38, 92%, 50%)",
  "hsl(273, 65%, 60%)",
  "hsl(340, 75%, 55%)",
  "hsl(222, 47%, 25%)",
];

interface ChannelPieChartProps {
  data: any[];
  onDrillDown?: (value: string) => void;
  variants: any;
}

export const ChannelPieChart = ({ data, onDrillDown, variants }: ChannelPieChartProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const pieData = useMemo(
    () =>
      data.slice(0, 6).map((item, index) => ({
        ...item,
        fill: PIE_COLORS[index % PIE_COLORS.length],
        nameKey: item.name.replace(/\s+/g, "_"),
      })),
    [data],
  );

  const topPerformer = useMemo(() => {
    return pieData.reduce((max, curr) => (curr.value > max.value ? curr : max), pieData[0]);
  }, [pieData]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = { value: { label: "Comissão" } };
    pieData.forEach((item) => {
      config[item.nameKey] = { label: item.name, color: item.fill };
    });
    return config;
  }, [pieData]);

  const activeItem = activeIndex !== null ? pieData[activeIndex] : topPerformer;

  return (
    <motion.div variants={variants} initial="hidden" animate="show" whileHover={{ scale: 1.01 }} className="h-full min-w-0">
      <Card className="flex h-full min-h-[480px] flex-col overflow-hidden">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-lg font-semibold">Comissão por Canal</CardTitle>
          <CardDescription>Distribuição de ganhos</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center pt-0">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square w-full max-w-[280px] [&_.recharts-responsive-container]:overflow-visible [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible"
          >
            <PieChart margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={78}
                strokeWidth={5}
                stroke="hsl(var(--card))"
                paddingAngle={2}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                cursor={onDrillDown ? "pointer" : undefined}
                {...(onDrillDown && { onClick: (d: any) => onDrillDown(d.name) })}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                  const RADIAN = Math.PI / 180;
                  const r = (innerRadius + outerRadius) / 2;
                  const x = (cx ?? 0) + r * Math.cos(-midAngle * RADIAN);
                  const y = (cy ?? 0) + r * Math.sin(-midAngle * RADIAN);
                  const pct = (percent * 100).toFixed(0);
                  if (Number(pct) < 8) return null;
                  return (
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-card font-medium"
                      style={{ fontSize: 10 }}
                    >
                      {pct}%
                    </text>
                  );
                }}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) - 8}
                            className="fill-muted-foreground text-[10px] font-medium uppercase tracking-wider"
                          >
                            {activeIndex !== null ? "Canal" : "Principal"}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 6}
                            className="text-xs font-semibold transition-colors duration-200"
                            style={{ fill: activeItem?.fill }}
                          >
                            {activeItem?.name}
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-wrap gap-2 border-t bg-muted/30 px-6 py-4">
          {pieData.map((item, index) => (
            <div
              key={item.name}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                activeIndex === index ? "bg-accent/15 ring-1 ring-accent/30" : "bg-muted/50",
              )}
            >
              <div
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.fill }}
                aria-hidden
              />
              <span className="truncate text-muted-foreground">{item.name}</span>
              <span className="font-semibold tabular-nums text-foreground">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </CardFooter>
      </Card>
    </motion.div>
  );
};
