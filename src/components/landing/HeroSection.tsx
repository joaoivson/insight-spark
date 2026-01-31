import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, TrendingUp, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscribe } from "@/shared/hooks/useSubscribe";

const HeroSection = () => {
  const { handleSubscribe, loading } = useSubscribe();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[var(--gradient-hero)]" />
      
      {/* Decorative circles */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6 mt-8"
          >
            <Zap className="w-4 h-4" />
            Antes do painel da Shopee atualizar!
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-7xl font-bold text-foreground leading-tight mb-6"
          >
            Pare de adivinhar. Veja exatamente quais links da Shopee estão te dando <span className="gradient-text">lucro real.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10"
          >
            O MarketDash transforma seus CSVs de cliques e comissões em insights claros para você escalar o que funciona e cortar o que dá prejuízo.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
          >
            <Button 
              variant="hero" 
              size="xl" 
              className="px-10 py-8 text-xl"
              onClick={() => handleSubscribe(true)}
              disabled={loading}
              aria-label="Ver meu lucro real agora"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  👉 Ver meu lucro real agora
                  <ArrowRight className="w-6 h-6 ml-2" />
                </>
              )}
            </Button>
          </motion.div>

          {/* Garantia */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-sm text-muted-foreground"
          >
            ✓ Setup em 2 minutos • ✓ Suporte em português • ✓ 7 dias de Garantia
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
          >
            {[
              { value: "5 min", label: "para começar" },
              { value: "ROAS", label: "em tempo real" },
              { value: "+Insights", label: "por canal" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
