import { TrendingUp, TrendingDown, DollarSign, Percent, ShoppingCart, Target } from "lucide-react";
import { cn } from "@/shared/lib/utils";

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
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border border-border p-6 hover-lift transition-all",
        onClick && "cursor-pointer hover:border-primary/50 active:scale-[0.98]"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
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
              "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
              changeType === "positive" && "text-success bg-success/10",
              changeType === "negative" && "text-destructive bg-destructive/10",
              changeType === "neutral" && "text-muted-foreground bg-muted"
            )}
          >
            {changeType === "positive" && <TrendingUp className="w-3 h-3" />}
            {changeType === "negative" && <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <div className="font-display text-2xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </div>
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
      {data.map((kpi) => (
        <KPICard
          key={kpi.title}
          {...kpi}
          changeType={kpi.changeType as any}
          onClick={() => onCardClick?.(kpi)}
        />
      ))}
    </div>
  );
};

export default KPICards;
