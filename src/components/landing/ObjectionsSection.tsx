import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, Wallet, Clock } from "lucide-react";

const objections = [
  {
    icon: Clock,
    title: "Setup em minutos",
    description: "Importe o CSV e veja o dashboard em menos de 5 minutos.",
  },
  {
    icon: Wallet,
    title: "ROI visível",
    description: "ROAS, comissão e lucro aparecem na mesma tela, sem fórmulas manuais.",
  },
  {
    icon: ShieldCheck,
    title: "Dados protegidos",
    description: "Seus dados ficam isolados por usuário e não são compartilhados.",
  },
  {
    icon: Sparkles,
    title: "Sem complexidade",
    description: "Você não precisa de BI, só do que importa para vender mais.",
  },
];

const ObjectionsSection = () => {
  return (
    <section className="py-20 bg-secondary/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Sem travas
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Nada de dúvidas na hora de começar
          </h2>
          <p className="text-muted-foreground text-lg">
            O MarketDash foi feito para ser rápido, simples e orientado a resultado.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {objections.map((item) => (
            <div key={item.title} className="bg-card rounded-2xl border border-border p-6">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ObjectionsSection;
