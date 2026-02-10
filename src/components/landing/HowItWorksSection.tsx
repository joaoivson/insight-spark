import { motion } from "framer-motion";
import { Upload, BarChart3, TrendingUp, ShoppingCart, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Importe seus dados",
    description: "Envie o CSV e normalize automaticamente faturamento e comissão.",
  },
  {
    number: "02",
    icon: ShoppingCart,
    title: "Registre os investimentos",
    description: "Cadastre gastos de anúncios por data e canal para medir ROAS real.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Otimize o crescimento",
    description: "Compare canais, filtros e relatórios para cortar desperdícios.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-secondary/30 relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        {/* Seção de Vídeo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Veja como funciona em menos de 2 minutos
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Descubra como nossa ferramenta pode transformar sua estratégia de afiliados Shopee
          </p>
          
          {/* Placeholder de Vídeo */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-border bg-card/50 backdrop-blur-sm">
            <div className="aspect-video bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4 hover:bg-accent/30 transition-colors cursor-pointer">
                  <Play className="w-10 h-10 text-accent ml-1" />
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Vídeo demonstrativo em breve
                </p>
                <Link to="/demo">
                  <Button variant="outline" size="lg">
                    Ver Demonstração Interativa
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Seção de Passos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
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
