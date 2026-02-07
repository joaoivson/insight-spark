import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { ChartTooltip, ChartTooltipContent, ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { motion } from "framer-motion";

const BAR_COLOR = "hsl(210, 80%, 55%)";
const PROFIT_COLOR = "hsl(173, 80%, 40%)";
const COST_COLOR = "hsl(38, 92%, 50%)";

interface RevenueProfitAreaChartProps {
  data: any[];
  onDrillDown?: (value: string) => void;
  variants: any;
}

export const RevenueProfitAreaChart = ({ data, onDrillDown, variants }: RevenueProfitAreaChartProps) => {
  const chartConfig = {
    commission: { label: "Comissão", color: BAR_COLOR },
    cost: { label: "Custos", color: COST_COLOR },
    profit: { label: "Lucro", color: PROFIT_COLOR },
  } satisfies ChartConfig;

  const periodLabel = useMemo(() => {
    if (!data || !data.length) return "Período exibido";
    const labels = data
      .map((item: any) => item?.mes_ano || item?.label || "")
      .filter((l: any) => typeof l === "string" && l.length >= 7);
    if (!labels.length) return "Período exibido";
    const toFmt = (l: string) => {
      const [y, m] = l.split("-");
      return y && m ? `${m}/${y}` : l;
    };
    const first = toFmt(labels[0]);
    const last = toFmt(labels[labels.length - 1]);
    return first === last ? first : `${first} a ${last}`;
  }, [data]);

  const dynamicMinWidth = useMemo(() => {
    return Math.max(320, data.length * 40);
  }, [data.length]);

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="show"
      whileHover={{ scale: 1.01 }}
      className="bg-card rounded-xl border border-border p-6"
    >
      <div className="mb-4">
        <h3 className="font-display font-semibold text-lg text-foreground">Comissão x Custos de Anúncios x Lucro</h3>
        <p className="text-sm text-muted-foreground">{periodLabel}</p>
      </div>
      <div className="h-80 sm:h-96 overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-thin scrollbar-thumb-accent/20">
        <ChartContainer config={chartConfig} className="h-full w-full" style={{ minWidth: dynamicMinWidth }}>
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ top: 30, right: 20, left: 10, bottom: 20 }}
            {...(onDrillDown && {
              onClick: (d: any) => {
                if (d && d.activePayload && d.activePayload[0]) {
                  onDrillDown(d.activePayload[0].payload.mes_ano);
                }
              },
            })}
          >
            <defs>
              <linearGradient id="fillCommission" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-commission)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-commission)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-cost)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-cost)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-profit)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-profit)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="mes_ano" 
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval="preserveStartEnd"
              tickFormatter={(value) => {
                if (typeof value === "string" && value.length >= 7) {
                  const [year, month] = value.split("-");
                  if (year && month) return `${month}/${year}`;
                }
                return value;
              }}
              tick={{ fontSize: 14 }}
            />
            <YAxis hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Area type="monotone" dataKey="commission" name="Comissão" stroke="var(--color-commission)" fillOpacity={1} fill="url(#fillCommission)" strokeWidth={2} stackId="a" />
            <Area type="monotone" dataKey="cost" name="Anúncios" stroke="var(--color-cost)" fillOpacity={1} fill="url(#fillCost)" strokeWidth={2} stackId="b" />
            <Area type="monotone" dataKey="profit" name="Lucro" stroke="var(--color-profit)" fillOpacity={1} fill="url(#fillProfit)" strokeWidth={3} stackId="c" />
            <Legend verticalAlign="top" height={36}/>
          </AreaChart>
        </ChartContainer>
      </div>
    </motion.div>
  );
};
