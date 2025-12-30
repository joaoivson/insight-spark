import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { BarChart3, Link2, Brain, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const modules = [
  {
    icon: BarChart3,
    title: "Análise Financeira Avançada",
    description: "Métricas avançadas, projeções e análise de tendências com machine learning.",
    status: "coming_soon",
    features: ["Projeções de receita", "Análise de sazonalidade", "Alertas inteligentes"],
  },
  {
    icon: Link2,
    title: "Integrações via API",
    description: "Conecte diretamente com suas plataformas de vendas e atualize dados automaticamente.",
    status: "coming_soon",
    features: ["Hotmart", "Eduzz", "Kiwify", "Monetizze"],
  },
  {
    icon: Brain,
    title: "Insights Inteligentes",
    description: "IA que analisa seus dados e sugere ações para aumentar seus resultados.",
    status: "coming_soon",
    features: ["Recomendações personalizadas", "Detecção de anomalias", "Relatórios automáticos"],
  },
];

const ModulesPage = () => {
  return (
    <DashboardLayout title="Módulos" subtitle="Expanda as funcionalidades da sua conta">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Info Banner */}
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                Módulos em Desenvolvimento
              </h3>
              <p className="text-muted-foreground text-sm">
                Estamos trabalhando em novos módulos para expandir suas capacidades de análise. 
                Fique atento às novidades!
              </p>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <motion.div
              key={module.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-xl border border-border p-6 hover-lift relative overflow-hidden group"
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <module.icon className="w-6 h-6 text-accent" />
                  </div>
                  <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                    Em breve
                  </Badge>
                </div>
                
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {module.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {module.description}
                </p>

                <div className="space-y-2 mb-6">
                  {module.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full" disabled>
                  Disponível em breve
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Request Module */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Precisa de uma funcionalidade específica?
          </p>
          <Button variant="outline">
            Sugerir Módulo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default ModulesPage;

