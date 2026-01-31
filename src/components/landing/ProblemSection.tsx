import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, FileX } from "lucide-react";

const ProblemSection = () => {
  const problems = [
    {
      icon: FileX,
      title: "CSV não é insight",
      description: "A Shopee te entrega milhares de linhas, mas nenhuma resposta. Você olha para os dados e continua sem saber o que fazer.",
    },
    {
      icon: AlertTriangle,
      title: "O prejuízo silencioso",
      description: "Você investe em tráfego, divulga links, mas não sabe qual deles está realmente colocando dinheiro no seu bolso.",
    },
    {
      icon: TrendingDown,
      title: "Escala no escuro",
      description: "Tentar escalar sem saber seu ROAS real por SubID é o jeito mais rápido de queimar seu lucro.",
    },
  ];

  return (
    <section id="problem" className="py-24 bg-secondary/10 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
            O Problema Real
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Você divulga links, investe em tráfego... <br />
            <span className="text-muted-foreground">mas não sabe o que está funcionando.</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Sem clareza, você escala errado e perde dinheiro sem perceber. O achismo é o maior inimigo do seu lucro como afiliado Shopee.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 hover:border-destructive/30 transition-colors group"
            >
              <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mb-6 group-hover:bg-destructive/20 transition-colors">
                <problem.icon className="w-7 h-7 text-destructive" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground mb-4">
                {problem.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {problem.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
