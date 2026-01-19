import { motion } from "framer-motion";
import { Upload, BarChart3, Filter, RefreshCw, Target, ShoppingCart } from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Importação em segundos",
    description: "Envie CSVs e visualize seus KPIs instantaneamente, sem depender de planilhas.",
  },
  {
    icon: BarChart3,
    title: "KPIs que importam",
    description: "Faturamento, comissão, gasto em anúncios, lucro e ROAS na mesma tela.",
  },
  {
    icon: Target,
    title: "Decisões por canal",
    description: "Veja a performance por Sub ID, plataforma e categoria com drill-down.",
  },
  {
    icon: ShoppingCart,
    title: "Controle de Ads",
    description: "Registre gastos e compare retorno real por canal e por período.",
  },
  {
    icon: Filter,
    title: "Filtros inteligentes",
    description: "Aplique período, status, categoria e canal sem perder contexto do negócio.",
  },
  {
    icon: RefreshCw,
    title: "Cache & velocidade",
    description: "Interface rápida com dados em cache e atualização controlada.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Funcionalidades
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo que você precisa para analisar seus dados
          </h2>
          <p className="text-muted-foreground text-lg">
            Ferramentas poderosas e intuitivas para transformar dados brutos em insights acionáveis.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="h-full glass-card rounded-2xl p-6 hover-lift cursor-pointer border border-transparent hover:border-accent/20">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
