import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis, ChartTooltip, ChartTooltipContent, ChartContainer, type ChartConfig } from "recharts";
import { motion } from "framer-motion";

const BAR_COLOR = "hsl(210, 80%, 55%)";

interface CategoryBarChartProps {
  data: any[];
  onDrillDown?: (value: string) => void;
  variants: any;
}

export const CategoryBarChart = ({ data, onDrillDown, variants }: CategoryBarChartProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartConfig = {
    value: { label: "Comissão", color: BAR_COLOR },
  } satisfies ChartConfig;

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="show"
      whileHover={{ scale: 1.01 }}
      className="bg-card rounded-xl border border-border p-6"
    >
      <div className="mb-4">
        <h3 className="font-display font-semibold text-lg text-foreground">Comissão por Categoria</h3>
        <p className="text-sm text-muted-foreground">Top 12 categorias</p>
      </div>
      <div className="h-96 overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
        <ChartContainer config={chartConfig} className="h-full w-full" style={{ minWidth: 320 }}>
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ top: 24, right: 20, left: 80, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} tickMargin={10} tick={{ fontSize: 14 }} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              radius={[0, 8, 8, 0]}
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
                    filter: activeIndex === index ? `drop-shadow(0px 0px 6px ${BAR_COLOR})` : 'none',
                    transition: 'all 0.3s ease',
                    opacity: activeIndex === null || activeIndex === index ? 1 : 0.6
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </motion.div>
  );
};
