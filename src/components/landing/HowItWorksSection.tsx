import { motion } from "framer-motion";
import { Upload, BarChart3, TrendingUp } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Faça Upload",
    description: "Carregue seu arquivo CSV com dados de vendas, custos e comissões.",
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Visualize",
    description: "Dashboards são gerados automaticamente com seus dados.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Analise",
    description: "Use filtros e relatórios para tomar decisões estratégicas.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-secondary/30 relative">
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
            Como Funciona
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comece em 3 simples passos
          </h2>
          <p className="text-muted-foreground text-lg">
            Do upload à análise em menos de 5 minutos.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-accent/50 to-transparent" />
              )}
              
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-card border border-border flex items-center justify-center shadow-card">
                    <step.icon className="w-10 h-10 text-accent" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground font-display font-bold text-sm flex items-center justify-center">
                    {step.number}
                  </div>
                </div>
                <h3 className="font-display font-semibold text-xl text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
