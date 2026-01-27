import { motion } from "framer-motion";
import { Star, ShieldCheck, Timer, TrendingUp, Users } from "lucide-react";

const stats = [
  { value: "+300", label: "afiliados já transformaram seus resultados", icon: Users },
  { value: "R$ 8,4M", label: "em receita monitorada", icon: ShieldCheck },
  { value: "4.9/5", label: "avaliação média", icon: Star },
  { value: "5 min", label: "tempo médio de setup", icon: Timer },
];

const testimonials = [
  {
    name: "Rafaele Monteiro",
    role: "Mentora e Afiliada Shopee",
    quote:
      "Estou maravilhada como ela está economizando o meu TEMPO🙏🏻 Ela está sendo primordial aqui pra mim, como uma Afiliada da Shopee profissional, em todas as análises que eu preciso fazer para otimizar minhas divulgações! Não vivo mais sem!",
    avatar: null,
  },
  {
    name: "Lilian Silva",
    role: "Mentora e Afiliada Shopee",
    quote:
      "A ferramenta MarketDash facilitou demais meu dia a dia nas análises de vendas e cliques, hoje analiso em poucos minutos todos meus sub id, de onde vieram as vendas, maiores horários de cliques... surreal! Indico de olhos fechados 🔥",
    avatar: null,
  },
  {
    name: "Achados da Durville",
    role: "Afiliada Shopee",
    quote:
      "A ferramenta tem me ajudado muito a entender melhor minhas vendas, identificar os horários de maior audiência e criar planos de ação com mais agilidade. Economizo tempo, não fico mais na ansiedade esperando o painel atualizar, e isso tem contribuído para meu crescimento diário. ❤️",
    avatar: null,
  },
  {
    name: "Mila Lima",
    role: "Afiliada Shopee",
    quote:
      "Eu chamo essa ferramenta de 'minha melhor amiga', pois realmente me ajuda diariamente nas métricas, nas análises, nos anúncios das minhas vendas na Shopee e, principalmente, em qual rede social e em qual horário me dedicar mais, pois não tenho muito tempo. É impressionante os detalhes que ela dá! E o melhor: antes de atualizar o painel da Shopee.",
    avatar: null,
  },
  {
    name: "Helen Rodrigues",
    role: "Afiliada Shopee",
    quote:
      "Estava procurando algo que facilitasse nas análises de métricas, quando achei essa ferramenta foi muito além do que eu estava procurando!!! Está me auxiliando muito e além disso ajudando a otimizar meus anúncios, fora isso que também calcula tudo do orgânico também! Incrível demais 🔥🔥",
    avatar: null,
  },
  {
    name: "Camila Rodrigues",
    role: "Afiliada Shopee",
    quote:
      "Em 2 dias já identifiquei quais Sub IDs davam prejuízo. Cortei custos e o ROAS subiu significativamente. A ferramenta me deu clareza total sobre onde investir meu dinheiro em anúncios.",
    avatar: null,
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
            Depoimentos
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Mais de 300 afiliados já transformaram seus resultados
          </h2>
          <p className="text-muted-foreground text-lg">
            Veja o que nossas usuárias estão dizendo sobre a ferramenta
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-4 mb-16">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-card rounded-xl border border-border p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className="w-4 h-4 text-accent" />
              </div>
              <div className="font-display text-xl font-bold text-foreground">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card rounded-2xl p-6 flex flex-col"
            >
              <div className="flex items-start gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-6 flex-1">"{item.quote}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent font-bold text-sm">
                    {item.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-foreground font-semibold">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
