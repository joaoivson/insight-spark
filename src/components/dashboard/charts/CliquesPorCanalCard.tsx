import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { Share2 } from "lucide-react";
import { ChartTooltip, ChartTooltipContent, ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

const BAR_COLORS = [
  "hsl(210, 80%, 55%)",
  "hsl(173, 80%, 40%)",
  "hsl(38, 92%, 50%)",
  "hsl(273, 65%, 60%)",
  "hsl(340, 75%, 55%)",
  "hsl(222, 47%, 25%)",
];

export type ChannelStatItem = { name: string; value: number; percentage?: number };

interface CliquesPorCanalCardProps {
  channelStats: ChannelStatItem[];
  pieActiveIndex: number | null;
  setPieActiveIndex: (index: number | null) => void;
  variants: { hidden: object; show: object };
}

export const CliquesPorCanalCard = ({
  channelStats,
  pieActiveIndex,
  setPieActiveIndex,
  variants,
}: CliquesPorCanalCardProps) => {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = { value: { label: "Cliques" } };
    channelStats.forEach((item, index) => {
      config[item.name.replace(/\s+/g, "_")] = {
        label: item.name,
        color: BAR_COLORS[index % BAR_COLORS.length],
      };
    });
    return config;
  }, [channelStats]);

  const chartData = useMemo(
    () =>
      channelStats.map((item, index) => ({
        ...item,
        fill: BAR_COLORS[index % BAR_COLORS.length],
      })),
    [channelStats],
  );

  const barHeight = useMemo(() => {
    const count = chartData.length;
    return Math.max(32, Math.min(56, 320 / count));
  }, [chartData.length]);

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="show"
      whileHover={{ scale: 1.01 }}
      className="h-full min-w-0"
    >
      <Card className="flex h-full min-h-[400px] flex-col overflow-hidden rounded-xl border border-border">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Share2 className="h-4 w-4 text-accent" />
            Cliques por Canal
          </CardTitle>
          <CardDescription>Distribuição de tráfego</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col pt-0">
          <ChartContainer
            config={chartConfig}
            className="h-full w-full min-h-[280px] [&_.recharts-responsive-container]:overflow-visible [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible"
          >
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
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
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar
                dataKey="value"
                nameKey="name"
                radius={[0, 4, 4, 0]}
                onMouseEnter={(_, index) => setPieActiveIndex(index)}
                onMouseLeave={() => setPieActiveIndex(null)}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => v?.toLocaleString("pt-BR")}
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
