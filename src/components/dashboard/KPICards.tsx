import { TrendingUp, TrendingDown, DollarSign, Percent, ShoppingCart, Target } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { motion } from "framer-motion";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  iconColor?: string;
  onClick?: () => void;
}

export interface KPIData {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  iconColor?: string;
}

const kpiCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  hover: {
    y: -4,
    scale: 1.02,
    boxShadow: "0 12px 24px -8px hsl(var(--accent) / 0.2)",
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
};

const KPICard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-accent",
  onClick,
}: KPICardProps) => {
  return (
    <motion.div
      onClick={onClick}
      variants={kpiCardVariants}
      initial="hidden"
      animate="show"
      whileHover={onClick ? "hover" : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={cn(
        "bg-card rounded-xl border border-border p-6 transition-all duration-300 min-w-0 overflow-hidden",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={onClick ? `${title}: ${value}` : undefined}
    >
      <div className="flex items-start justify-between mb-4 gap-2 min-w-0">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            iconColor === "text-accent" && "bg-accent/10",
            iconColor === "text-success" && "bg-success/10",
            iconColor === "text-warning" && "bg-warning/10",
            iconColor === "text-chart-5" && "bg-chart-5/10"
          )}
        >
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
        {change && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full flex-shrink-0",
              changeType === "positive" && "text-success bg-success/10",
              changeType === "negative" && "text-destructive bg-destructive/10",
              changeType === "neutral" && "text-muted-foreground bg-muted"
            )}
          >
            {changeType === "positive" && <TrendingUp className="w-3 h-3 flex-shrink-0" />}
            {changeType === "negative" && <TrendingDown className="w-3 h-3 flex-shrink-0" />}
            <span className="whitespace-nowrap">{change}</span>
          </div>
        )}
      </div>
      <motion.div
        className="font-display font-bold text-foreground mb-1 min-w-0"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
        key={value}
      >
        <span 
          className="block break-words overflow-wrap-anywhere text-xl sm:text-2xl leading-tight" 
          title={value}
        >
          {value}
        </span>
      </motion.div>
      <div className="text-sm text-muted-foreground truncate" title={title}>{title}</div>
    </motion.div>
  );
};

const KPICards = ({
  kpis,
  onCardClick,
}: {
  kpis: KPIData[];
  onCardClick?: (kpi: KPIData) => void;
}) => {
  const data = kpis.length
    ? kpis
    : [
        {
          title: "Receita Total",
          value: "R$ 0,00",
          changeType: "neutral",
          icon: DollarSign,
          iconColor: "text-success",
        },
        {
          title: "Custos Totais",
          value: "R$ 0,00",
          changeType: "neutral",
          icon: ShoppingCart,
          iconColor: "text-warning",
        },
        {
          title: "Comissões",
          value: "R$ 0,00",
          changeType: "neutral",
          icon: Percent,
          iconColor: "text-chart-5",
        },
        {
          title: "Lucro Líquido",
          value: "R$ 0,00",
          changeType: "neutral",
          icon: Target,
          iconColor: "text-accent",
        },
      ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6"
    >
      {data.map((kpi, index) => (
        <KPICard
          key={kpi.title}
          {...kpi}
          changeType={kpi.changeType as any}
          onClick={() => onCardClick?.(kpi)}
        />
      ))}
    </motion.div>
  );
};

export default KPICards;
