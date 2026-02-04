import { useMemo, useState } from "react";
import { Pie, PieChart, Label } from "recharts";
import { ChartTooltip, ChartTooltipContent, ChartContainer, type ChartConfig } from "@/components/ui/chart";
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
  
  const pieData = useMemo(() => data.slice(0, 6).map((item, index) => ({
    ...item,
    fill: PIE_COLORS[index % PIE_COLORS.length],
    nameKey: item.name.replace(/\s+/g, "_")
  })), [data]);

  const topPerformer = useMemo(() => {
    return pieData.reduce((max, curr) => (curr.value > max.value ? curr : max), pieData[0]);
  }, [pieData]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      value: { label: "Comissão" }
    };
    pieData.forEach((item) => {
      config[item.nameKey] = {
        label: item.name,
        color: item.fill,
      };
    });
    return config;
  }, [pieData]);

  const activeItem = activeIndex !== null ? pieData[activeIndex] : topPerformer;

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="show"
      whileHover={{ scale: 1.01 }}
      className="bg-card rounded-xl border border-border p-6 flex flex-col"
    >
      <div className="mb-4">
        <h3 className="font-display font-semibold text-lg text-foreground">Comissão por Canal</h3>
        <p className="text-sm text-muted-foreground">Distribuição de ganhos</p>
      </div>
      <div className="flex-1 min-h-[400px] overflow-visible">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[450px] w-full overflow-visible [&_.recharts-responsive-container]:overflow-visible [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible">
          <PieChart margin={{ top: 20, right: 160, left: 160, bottom: 20 }}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={90}
              outerRadius={125}
              strokeWidth={8}
              stroke="hsl(var(--card))"
              paddingAngle={2}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              cursor={onDrillDown ? "pointer" : undefined}
              {...(onDrillDown && { onClick: (d: any) => onDrillDown(d.name) })}
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
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 12} className="fill-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                          {activeIndex !== null ? "Canal Focado" : "Principal"}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 10} className="text-lg font-black transition-colors duration-300" style={{ fill: activeItem?.fill }}>
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
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {pieData.map((item, index) => (
          <div key={item.name} className={cn("flex items-center gap-2 p-2 rounded-lg transition-colors", activeIndex === index ? "bg-accent/10 ring-1 ring-accent/20" : "bg-secondary/5")}>
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-muted-foreground truncate font-medium">{item.name}</span>
              <span className="text-xs font-bold text-foreground">{formatCurrency(item.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
