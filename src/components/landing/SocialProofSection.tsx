import { motion } from "framer-motion";
import { Star, ShieldCheck, Timer, TrendingUp } from "lucide-react";

const stats = [
  { value: "+1.200", label: "relatórios gerados", icon: TrendingUp },
  { value: "R$ 8,4M", label: "em receita monitorada", icon: ShieldCheck },
  { value: "4.9/5", label: "avaliação média", icon: Star },
  { value: "5 min", label: "tempo médio de setup", icon: Timer },
];

const testimonials = [
  {
    name: "Camila R.",
    role: "Afiliada Shopee",
    quote:
      "Em 2 dias já identifiquei quais Sub IDs davam prejuízo. Cortei custos e o ROAS subiu.",
  },
  {
    name: "Felipe S.",
    role: "Seller multicanal",
    quote:
      "O painel me mostrou exatamente onde o lucro estava vazando. Agora decido com clareza.",
  },
  {
    name: "Marina P.",
    role: "Gestora de tráfego",
    quote:
      "A comparação de Ads x comissão virou meu principal relatório. Simples e direto.",
  },
];

const SocialProofSection = () => {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Prova social
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Resultados reais para quem vive de performance
          </h2>
          <p className="text-muted-foreground text-lg">
            Times de afiliados e sellers já tomam decisões com base nos mesmos KPIs que você verá aqui.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className="w-4 h-4 text-accent" />
              </div>
              <div className="font-display text-xl font-bold text-foreground">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((item) => (
            <div key={item.name} className="glass-card rounded-2xl p-6">
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{item.quote}"</p>
              <div className="text-sm text-foreground font-semibold">{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
