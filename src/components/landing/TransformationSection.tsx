import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import DashboardShowcaseSection from "./DashboardShowcaseSection";

const TransformationSection = () => {
  return (
    <section id="solution" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
            A Transformação
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            De divulgador perdido a <br />
            <span className="gradient-text">operador de performance.</span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          {/* Antes */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-secondary/20 rounded-3xl p-8 border border-border relative overflow-hidden group"
          >
            <div className="absolute top-4 right-4 text-destructive/20 group-hover:text-destructive/40 transition-colors">
              <XCircle className="w-24 h-24" />
            </div>
            <h3 className="font-display font-bold text-2xl text-foreground mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-sm">✕</span>
              Antes do MarketDash
            </h3>
            <ul className="space-y-4">
              {[
                "Planilhas de CSV confusas e impossíveis de ler",
                "Decisões baseadas no 'eu acho que vendeu'",
                "Dinheiro jogado fora em anúncios que não dão lucro",
                "Zero clareza sobre qual SubID realmente performa",
                "Sensação constante de estar perdendo dinheiro"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-destructive/40 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Depois */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-accent/5 rounded-3xl p-8 border border-accent/20 relative overflow-hidden group"
          >
            <div className="absolute top-4 right-4 text-accent/20 group-hover:text-accent/40 transition-colors">
              <CheckCircle2 className="w-24 h-24" />
            </div>
            <h3 className="font-display font-bold text-2xl text-foreground mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm">✓</span>
              Com MarketDash
            </h3>
            <ul className="space-y-4">
              {[
                "Top 10 produtos e categorias campeãs visíveis",
                "ROAS e Lucro Real calculados automaticamente",
                "Visão clara de qual link e canal gera lucro",
                "Escala inteligente baseada em dados reais",
                "Controle total sobre cada centavo investido"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Dashboard Preview Reused */}
        <div className="mt-12">
          <DashboardShowcaseSection />
        </div>
      </div>
    </section>
  );
};

export default TransformationSection;
