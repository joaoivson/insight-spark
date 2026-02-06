import { useState, ReactNode } from "react";
import { motion, Variants } from "framer-motion";
import type { DatasetRow } from "./DataTable";
import {
  groupByMesAno,
  groupCommissionByDay,
  groupRevenueProfitByMes,
  groupByPlatform,
  groupByCategory,
} from "../../shared/lib/chart-utils";
import { EvolutionBarChart } from "./charts/EvolutionBarChart";
import { RevenueProfitAreaChart } from "./charts/RevenueProfitAreaChart";
import { ChannelPieChart } from "./charts/ChannelPieChart";
import { CategoryBarChart } from "./charts/CategoryBarChart";

export type DrillDownType = "mes_ano" | "category" | "sub_id1" | "product" | "platform";

interface DashboardChartsProps {
  rows: DatasetRow[];
  adSpends?: any[];
  dateRange?: { from?: Date; to?: Date };
  subIdFilter?: string;
  onDrillDown?: (type: DrillDownType, value: string) => void;
  belowRevenueContent?: ReactNode;
}

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

const DashboardCharts = ({ rows, adSpends = [], dateRange, subIdFilter, onDrillDown, belowRevenueContent }: DashboardChartsProps) => {
  const [commissionMode, setCommissionMode] = useState<"month" | "day">("month");

  if (!rows.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-6"
      >
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-muted-foreground text-sm mb-2">Nenhum dado disponível</p>
        </div>
      </motion.div>
    );
  }

  const mesAnoData = groupByMesAno(rows, dateRange);
  const commissionDayData = groupCommissionByDay(rows, dateRange);
  const revProfitData = groupRevenueProfitByMes(rows, adSpends, dateRange, subIdFilter);
  const channelData = groupByPlatform(rows, dateRange);
  const categoryData = groupByCategory(rows, dateRange);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-6 mt-6"
    >
      <EvolutionBarChart
        data={commissionMode === "month" ? mesAnoData : commissionDayData}
        mode={commissionMode}
        onModeChange={setCommissionMode}
        onDrillDown={(v) => onDrillDown?.("mes_ano", v)}
        variants={chartItemVariants}
      />
      <RevenueProfitAreaChart 
        data={revProfitData} 
        onDrillDown={(v) => onDrillDown?.("mes_ano", v)} 
        variants={chartItemVariants}
      />
      {belowRevenueContent}
      <section
        aria-label="Comissão por canal e categoria"
        className="grid grid-cols-1 gap-6 items-stretch min-w-0 sm:gap-6 lg:grid-cols-2 lg:gap-8"
      >
        <div className="min-w-0">
          <ChannelPieChart
            data={channelData}
            onDrillDown={(v) => onDrillDown?.("platform", v)}
            variants={chartItemVariants}
          />
        </div>
        <div className="min-w-0">
          <CategoryBarChart
            data={categoryData}
            onDrillDown={(v) => onDrillDown?.("category", v)}
            variants={chartItemVariants}
          />
        </div>
      </section>
    </motion.div>
  );
};

export default DashboardCharts;
