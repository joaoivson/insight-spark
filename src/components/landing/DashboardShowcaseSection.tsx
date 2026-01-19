import { motion } from "framer-motion";
import { BarChart3, ShoppingCart, Target, TrendingUp } from "lucide-react";

const DashboardShowcaseSection = () => {
  return (
    <section id="dashboard-preview" className="py-24 relative">
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
            KPIs, gráficos e relatórios de performance reunidos em um só lugar para decisões rápidas.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card rounded-3xl p-6 md:p-8 border border-border/60"
        >
          <div className="grid md:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Faturamento", value: "R$ 157.320", icon: TrendingUp, tone: "text-success" },
              { label: "Comissão", value: "R$ 5.064", icon: BarChart3, tone: "text-primary" },
              { label: "Gasto Ads", value: "R$ 5.932", icon: ShoppingCart, tone: "text-warning" },
              { label: "Lucro", value: "-R$ 868", icon: Target, tone: "text-accent" },
              { label: "ROAS", value: "26.52x", icon: TrendingUp, tone: "text-chart-5" },
            ].map((card) => (
              <div key={card.label} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                  <card.icon className={`w-4 h-4 ${card.tone}`} />
                </div>
                <div className="font-display font-bold text-lg text-foreground">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-secondary/40 rounded-xl border border-border/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">Comissão x Ads x Lucro</span>
                <span className="text-[11px] text-muted-foreground">11/2025 a 01/2026</span>
              </div>
              <div className="h-28 flex items-end gap-2">
                {[42, 58, 36, 68, 48, 70].map((h, i) => (
                  <div key={i} className="flex-1">
                    <div className="rounded-md bg-primary/40" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 text-xs text-muted-foreground">
                <span>Comissão: R$ 5.064</span>
                <span>Ads: R$ 5.932</span>
                <span>Lucro: -R$ 868</span>
              </div>
            </div>
            <div className="bg-secondary/40 rounded-xl border border-border/50 p-4">
              <div className="text-xs text-muted-foreground mb-3">Relatório mensal</div>
              <div className="space-y-2 text-xs">
                {[
                  { month: "Nov/2025", lucro: "-R$ 2.354", roas: "2.2x" },
                  { month: "Dez/2025", lucro: "R$ 1.646", roas: "46.7x" },
                  { month: "Jan/2026", lucro: "R$ 868", roas: "12.4x" },
                ].map((row) => (
                  <div key={row.month} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{row.month}</span>
                    <span className="text-foreground">{row.lucro}</span>
                    <span className="text-success">{row.roas}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardShowcaseSection;
