import { motion } from "framer-motion";
import {
  DollarSign, Hash, SlidersHorizontal, Plug,
  Activity, MessageCircle,
  type LucideIcon,
} from "lucide-react";

type Benefit = {
  icon: LucideIcon;
  title: string;
  description: string;
  impact: string;
  soon?: boolean;
};

const benefits: Benefit[] = [
  {
    icon: DollarSign,
    title: "Lucro real, não faturamento",
    description: "Comissão menos gasto com anúncios — já considerando seus impostos. Pare de comemorar venda que dá prejuízo.",
    impact: "Lucro líquido",
  },
  {
    icon: Hash,
    title: "Análise por Sub ID e canal",
    description: "Veja exatamente qual link do Instagram, TikTok ou WhatsApp coloca dinheiro no seu bolso — e qual só queima verba.",
    impact: "Controle total",
  },
  {
    icon: SlidersHorizontal,
    title: "Controle de campanha no painel",
    description: "Pause, ative e ajuste o orçamento das campanhas do Meta sem sair do MarketDash. Decisão e ação no mesmo lugar.",
    impact: "Aja na hora",
  },
  {
    icon: Plug,
    title: "Shopee + Meta Ads conectados",
    description: "Suas comissões da Shopee e o gasto dos anúncios do Meta no mesmo painel, atribuídos por Sub ID. ROAS e ROI de verdade.",
    impact: "Visão unificada",
  },
  {
    icon: Activity,
    title: "Monitor de vendas em tempo real",
    description: "Acompanhe cada venda nova da Shopee assim que cai — com alerta na hora, sem esperar o relatório do dia seguinte.",
    impact: "Tempo real",
    soon: true,
  },
  {
    icon: MessageCircle,
    title: "Disparos no WhatsApp",
    description: "Envie suas promoções para listas de contatos e grupos direto do painel, com ritmo seguro para não derrubar seu número.",
    impact: "Venda mais",
    soon: true,
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-16 md:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12 md:mb-20"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Tudo em um só lugar
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            A central de comando do{" "}
            <span className="text-accent">afiliado profissional</span>
          </h2>
          <p className="text-base md:text-xl text-muted-foreground">
            Do lucro real ao disparo da promoção: as ferramentas de quem vive de performance e não tem tempo a perder com planilha.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="group relative bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 md:p-8 hover:border-accent/40 transition-all hover:shadow-md hover:shadow-accent/5"
            >
              {benefit.soon && (
                <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Em breve
                </span>
              )}
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
