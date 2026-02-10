import { motion } from "framer-motion";
import { BarChart3, ShoppingCart, Target, TrendingUp, DollarSign, MousePointerClick, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const DashboardShowcaseSection = () => {
  const kpis = [
    { label: "Cliques Totais", value: "9.370", icon: MousePointerClick, tone: "text-accent", bg: "bg-accent/10" },
    { label: "Faturamento", value: "R$ 312.324,04", icon: DollarSign, tone: "text-success", bg: "bg-success/10" },
    { label: "Comissão", value: "R$ 10.344,93", icon: BarChart3, tone: "text-primary", bg: "bg-primary/10" },
    { label: "Gasto Ads", value: "R$ 50,00", icon: ShoppingCart, tone: "text-warning", bg: "bg-warning/10" },
    { label: "Lucro Real", value: "R$ 10.294,93", icon: Target, tone: "text-success", bg: "bg-success/10" },
    { label: "ROAS", value: "206.90x", icon: TrendingUp, tone: "text-accent", bg: "bg-accent/10" },
  ];

  const comparisonData = [
    { subId: "dispenser01", ads: 10, csv: 9275, diff: -9265, percent: "-99.8%" },
    { subId: "cozinha_top", ads: 540, csv: 512, diff: 28, percent: "+5.4%" },
    { subId: "shopee_ads", ads: 1250, csv: 1248, diff: 2, percent: "+0.1%" },
  ];

  return (
    <section id="dashboard-preview" className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Dashboard real
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            O mesmo painel que você verá ao entrar
          </h2>
          <p className="text-muted-foreground text-lg">
            KPIs precisos, gráficos de tendência e comparativos automáticos para você não perder nenhum centavo.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="glass-card rounded-3xl p-3 md:p-6 border border-border/60 relative shadow-2xl shadow-black/40 max-w-6xl mx-auto"
        >
          {/* Top KPI Cards Mockup */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {kpis.map((card) => (
              <div key={card.label} className="bg-card rounded-xl border border-border p-3 hover:border-accent/30 transition-colors">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", card.bg)}>
                    <card.icon className={cn("w-3.5 h-3.5", card.tone)} />
                  </div>
                </div>
                <div className="font-display font-bold text-sm md:text-base text-foreground whitespace-nowrap overflow-hidden text-ellipsis mb-0.5" title={card.value}>
                  {card.value}
                </div>
                <div className="text-[10px] text-muted-foreground truncate" title={card.label}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {/* Main Chart Mockup */}
            <div className="lg:col-span-3 bg-secondary/20 rounded-2xl border border-border/50 p-5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-0.5">Comissão x Ads x Lucro</h4>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Performance Semanal</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[9px] text-muted-foreground uppercase">Comissão</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                    <span className="text-[9px] text-muted-foreground uppercase">Gasto Ads</span>
                  </div>
                </div>
              </div>
              
              <div className="h-32 flex items-end gap-2 md:gap-3 px-1">
                {[35, 55, 25, 75, 45, 85, 65, 30].map((h, i) => (
                  <div key={i} className="flex-1 group relative">
                    <div className="w-full rounded-t-md bg-primary/40 group-hover:bg-primary/60 transition-colors" style={{ height: `${h}%` }} />
                    <div className="w-full h-1 bg-primary/10 mt-0.5 rounded-b-sm" />
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex justify-between text-[9px] text-muted-foreground px-1 uppercase tracking-tighter">
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>
            </div>

            {/* Comparison Table Mockup */}
            <div className="lg:col-span-2 bg-secondary/20 rounded-2xl border border-border/50 p-5">
              <div className="flex items-center justify-between mb-5">
                <h4 className="text-xs font-bold text-foreground">Comparativo Ads vs CSV</h4>
                <span className="text-[9px] text-accent font-medium px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">Por Sub ID</span>
              </div>
              
              <div className="space-y-2.5">
                <div className="grid grid-cols-4 text-[9px] text-muted-foreground uppercase font-bold px-2">
                  <span>Sub ID</span>
                  <span className="text-right">Ads</span>
                  <span className="text-right">CSV</span>
                  <span className="text-right">Dif.</span>
                </div>
                {comparisonData.map((row, i) => (
                  <div key={i} className="grid grid-cols-4 items-center p-2 rounded-lg bg-card/40 border border-border/40 text-[10px] hover:border-accent/20 transition-colors">
                    <span className="font-medium text-foreground truncate">{row.subId}</span>
                    <span className="text-right font-mono">{row.ads}</span>
                    <span className="text-right font-mono">{row.csv}</span>
                    <div className={cn(
                      "flex items-center justify-end font-bold",
                      row.diff >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {row.diff > 0 ? <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> : <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />}
                      {row.percent}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
                <div className="text-[10px] text-muted-foreground">
                  Identificado <span className="text-foreground font-bold">1 diferença</span> crítica
                </div>
                <span className="text-[9px] text-accent font-bold cursor-pointer hover:underline">Ver todos →</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardShowcaseSection;
