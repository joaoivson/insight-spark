import { TrendingUp, TrendingDown, DollarSign, Percent, ShoppingCart, Target } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  iconColor?: string;
}

const KPICard = ({ title, value, change, changeType = "neutral", icon: Icon, iconColor = "text-accent" }: KPICardProps) => {
  return (
    <div className="bg-card rounded-xl border border-border p-6 hover-lift">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", 
          iconColor === "text-accent" && "bg-accent/10",
          iconColor === "text-success" && "bg-success/10",
          iconColor === "text-warning" && "bg-warning/10",
          iconColor === "text-chart-5" && "bg-chart-5/10"
        )}>
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
            changeType === "positive" && "text-success bg-success/10",
            changeType === "negative" && "text-destructive bg-destructive/10",
            changeType === "neutral" && "text-muted-foreground bg-muted"
          )}>
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

const KPICards = () => {
  const kpis = [
    { title: "Receita Total", value: "R$ 45.230,00", change: "+12.5%", changeType: "positive" as const, icon: DollarSign, iconColor: "text-success" },
    { title: "Custos Totais", value: "R$ 12.450,00", change: "+3.2%", changeType: "negative" as const, icon: ShoppingCart, iconColor: "text-warning" },
    { title: "Comissões", value: "R$ 4.523,00", change: "+8.1%", changeType: "positive" as const, icon: Percent, iconColor: "text-chart-5" },
    { title: "Lucro Líquido", value: "R$ 28.257,00", change: "+15.3%", changeType: "positive" as const, icon: Target, iconColor: "text-accent" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi) => (
        <KPICard key={kpi.title} {...kpi} />
      ))}
    </div>
  );
};

export default KPICards;
