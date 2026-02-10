import { motion } from "framer-motion";
import { Target, TrendingUp, BarChart } from "lucide-react";

const StrategySection = () => {
  return (
    <section className="py-24 bg-secondary/30 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              Visão Estratégica
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Por que a clareza é o seu <br />
              <span className="text-accent">maior diferencial competitivo?</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-lg text-foreground mb-2">Decisão rápida</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Afiliados que crescem não são os que postam mais links. São os que sabem interpretar dados e agir rápido para cortar o que não funciona.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-lg text-foreground mb-2">Escala segura</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Quando você sabe seu ROAS por canal, escalar não é mais um risco, é uma escolha matemática. Você coloca dinheiro onde sabe que volta.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <BarChart className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-lg text-foreground mb-2">Fim do desperdício</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Pare de queimar lucro em campanhas que só geram cliques vazios. Identifique o que realmente converte e otimize seu tempo.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="glass-card rounded-3xl p-10 border border-accent/20 relative"
            >
              <div className="absolute -top-6 -left-6 w-12 h-12 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-bold shadow-lg shadow-accent/20">
                “
              </div>
              <p className="text-2xl font-display font-medium text-foreground leading-relaxed italic mb-6">
                O MarketDash transforma você de um simples divulgador de links em um operador de performance profissional.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary" />
                <div>
                  <div className="font-bold text-foreground">Equipe MarketDash</div>
                  <div className="text-sm text-muted-foreground italic">Foco em Lucro e Escala</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StrategySection;
