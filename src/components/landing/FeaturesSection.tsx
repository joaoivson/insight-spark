import { motion } from "framer-motion";
import { 
  Upload, BarChart3, Filter, RefreshCw, Target, ShoppingCart, 
  DollarSign, Package, TrendingUp, MousePointer, Clock, Hash,
  FileText, PieChart
} from "lucide-react";

const featureCategories = [
  {
    category: "Comissões",
    icon: DollarSign,
    features: [
      {
        icon: DollarSign,
        title: "Total de Comissões",
        description: "Mostra o valor total recebido em comissões de vendas, consolidado e organizado.",
      },
      {
        icon: BarChart3,
        title: "Total de Comissões por Canal/Plataforma",
        description: "Apresenta o valor total de comissões separadas por cada canal de divulgação (Instagram, WhatsApp, TikTok, etc.).",
      },
      {
        icon: Hash,
        title: "Total de Comissões por Sub_Id",
        description: "Indica o valor total de comissões separadas por Sub_Id, ideal para quem usa tráfego pago e precisa identificar campanhas.",
      },
    ],
  },
  {
    category: "Pedidos",
    icon: Package,
    features: [
      {
        icon: Package,
        title: "Total de Pedidos",
        description: "Exibe a quantidade total de pedidos gerados a partir dos seus links de afiliado.",
      },
      {
        icon: Target,
        title: "Total de Pedidos por Canal/Plataforma",
        description: "Mostra quantos pedidos foram feitos em cada canal de divulgação utilizado.",
      },
      {
        icon: Hash,
        title: "Total de Pedidos por Sub_Id",
        description: "Mostra a quantidade de pedidos gerados por cada Sub_Id, ajudando na análise de campanhas de tráfego pago.",
      },
    ],
  },
  {
    category: "Cliques",
    icon: MousePointer,
    features: [
      {
        icon: MousePointer,
        title: "Total de Cliques",
        description: "Aponta o número total de cliques gerados nos seus links de afiliado.",
      },
      {
        icon: Target,
        title: "Total de Cliques por Canal/Plataforma",
        description: "Informa quantos cliques vieram de cada canal/plataforma de divulgação.",
      },
      {
        icon: Clock,
        title: "Total de Cliques por Horário",
        description: "Mostra os horários do dia com maior volume de cliques, ajudando a otimizar suas campanhas.",
      },
      {
        icon: Hash,
        title: "Total de Cliques por Sub_Id",
        description: "Mostra a quantidade de cliques em links da Shopee que você adicionou Sub_Id, informação importante para quem faz tráfego pago.",
      },
    ],
  },
  {
    category: "Análises Avançadas",
    icon: TrendingUp,
    features: [
      {
        icon: PieChart,
        title: "Análise de ROAS",
        description: "Cálculo automático de Retorno sobre Investimento em Anúncios, comparando comissões com gastos em ads.",
      },
      {
        icon: ShoppingCart,
        title: "Gestão de Gastos em Anúncios",
        description: "Registre e acompanhe todos os gastos em anúncios por data, canal e Sub_Id para análise precisa.",
      },
      {
        icon: FileText,
        title: "Relatórios Mensais",
        description: "Gere relatórios detalhados mensais com todos os KPIs e métricas consolidadas.",
      },
      {
        icon: Filter,
        title: "Filtros Avançados",
        description: "Aplique filtros por período, status, categoria, canal e Sub_Id para análises específicas.",
      },
      {
        icon: Upload,
        title: "Importação Ilimitada",
        description: "Importe quantos CSVs precisar, sem limite de análises ou dados processados.",
      },
      {
        icon: RefreshCw,
        title: "Atualização Rápida",
        description: "Interface rápida com cache local e atualização controlada para performance otimizada.",
      },
    ],
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
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
            Funcionalidades
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Funcionalidades que fazem a diferença
          </h2>
          <p className="text-muted-foreground text-lg">
            Recursos desenvolvidos especificamente para afiliados Shopee que querem resultados
          </p>
        </motion.div>

        {/* Features por Categoria */}
        <div className="space-y-12">
          {featureCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-display font-bold text-2xl text-foreground">
                  {category.category}
                </h3>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.features.map((feature, featureIndex) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: (categoryIndex * 0.1) + (featureIndex * 0.05) }}
                    className="group"
                  >
                    <div className="h-full glass-card rounded-2xl p-6 hover-lift cursor-pointer border border-transparent hover:border-accent/20">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                        <feature.icon className="w-6 h-6 text-accent" />
                      </div>
                      <h4 className="font-display font-semibold text-lg text-foreground mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
