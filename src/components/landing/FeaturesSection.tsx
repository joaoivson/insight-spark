import { motion } from "framer-motion";
import { 
  Upload, BarChart3, Filter, Target, ShoppingCart, 
  DollarSign, TrendingUp, MousePointer, Hash
} from "lucide-react";

const benefits = [
  {
    icon: Upload,
    title: "Upload simples de CSV",
    description: "Transforme dados brutos da Shopee em relatórios financeiros em segundos. Sem fórmulas, sem perda de tempo.",
    impact: "Clareza instantânea"
  },
  {
    icon: Hash,
    title: "Análise por Canal e SubID",
    description: "Identifique exatamente qual link do Instagram, TikTok ou WhatsApp está colocando dinheiro no seu bolso.",
    impact: "Controle total"
  },
  {
    icon: Target,
    title: "Identificação de Lucro Real",
    description: "Veja seu lucro líquido após descontar gastos com anúncios. Saiba onde escalar e onde cortar custos.",
    impact: "Escala profissional"
  },
  {
    icon: TrendingUp,
    title: "Top Produtos e Categorias",
    description: "Descubra os campeões de vendas e categorias que mais convertem para focar seus esforços no que dá resultado.",
    impact: "Foco no lucro"
  },
  {
    icon: MousePointer,
    title: "Métricas de Cliques Reais",
    description: "Acompanhe cliques, conversão e CPC real. Saiba se seu tráfego pago está valendo a pena em tempo real.",
    impact: "Decisão baseada em dados"
  },
  {
    icon: Filter,
    title: "Filtros Estratégicos",
    description: "Analise performance por período, status de pedido e categorias para entender o comportamento do seu público.",
    impact: "Inteligência de mercado"
  }
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Na Prática
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            O que você consegue fazer com o <br />
            <span className="text-accent">MarketDash hoje?</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Ferramentas pensadas para quem vive de performance e não tem tempo a perder com planilhas.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 hover:border-accent/40 transition-all hover:shadow-2xl hover:shadow-accent/5"
            >
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <benefit.icon className="w-7 h-7 text-accent" />
              </div>
              <div className="text-accent text-xs font-bold uppercase tracking-wider mb-2">{benefit.impact}</div>
              <h3 className="font-display font-bold text-xl text-foreground mb-4">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
