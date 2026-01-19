import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { APP_CONFIG } from "@/core/config/app.config";

const PricingSection = () => {
  const features = [
    "KPIs essenciais (Faturamento, Comissão, Ads, Lucro, ROAS)",
    "Painel por canal, plataforma e categoria",
    "Importação de CSV ilimitada",
    "Gestão de gastos em anúncios",
    "Relatórios mensais e filtros avançados",
    "Atualização rápida com cache local",
    "Segurança e privacidade dos dados",
    "Acesso ilimitado",
  ];

  return (
    <section id="pricing" className="py-24 relative">
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
            Preços
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Um plano para crescer com clareza
          </h2>
          <p className="text-muted-foreground text-lg">
            Um único plano com tudo que você precisa para começar.
          </p>
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-lg mx-auto"
        >
          <div className="glass-card rounded-3xl p-8 border-2 border-accent/30 relative overflow-hidden">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
            
            {/* Badge */}
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
              MAIS POPULAR
            </div>

            <div className="relative z-10">
              <h3 className="font-display font-bold text-2xl text-foreground mb-2">
                Plano Growth
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                Tudo para medir retorno, reduzir custos e escalar canais vencedores
              </p>

              <div className="flex items-baseline gap-2 mb-8">
                <span className="font-display text-5xl font-bold text-foreground">R$ 67</span>
                <span className="text-muted-foreground">/mês</span>
              </div>

              <a href={APP_CONFIG.EXTERNALS.SUBSCRIBE_URL} target="_blank" rel="noreferrer" className="block mb-8">
                <Button variant="hero" size="lg" className="w-full">
                  Assinar Agora
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </a>

              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-accent" />
                    </div>
                    <span className="text-foreground text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Future Modules Teaser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground text-sm">
            Em breve: Módulos avançados de IA, integrações via API e muito mais.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
