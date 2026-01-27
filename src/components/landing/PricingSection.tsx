import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { caktoService, PlanInfo, getPlanPrice, isBestOffer, calculateAnnualSavings, getAnnualMonthlyEquivalent } from "@/services/cakto.service";
import { tokenStorage, userStorage } from "@/shared/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { UrgencyTimer } from "./UrgencyTimer";

const PricingSection = () => {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plansList = await caktoService.getPlans();
        // Ordenar: anual primeiro, depois mensal e trimestral
        const sortedPlans = [...plansList].sort((a, b) => {
          const order: Record<string, number> = { 'anual': 0, 'mensal': 1, 'trimestral': 2 };
          return (order[a.period] ?? 99) - (order[b.period] ?? 99);
        });
        setPlans(sortedPlans);
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
        // Fallback: criar planos padrão se API falhar
        setPlans([
          { id: "anual", name: "MarketDash Anual", checkout_url: "https://pay.cakto.com.br/ebrg3ir", period: "anual" },
          { id: "principal", name: "MarketDash Mensal", checkout_url: "https://pay.cakto.com.br/8e9qxyg_742442", period: "mensal" },
          { id: "trimestral", name: "MarketDash Trimestral", checkout_url: "https://pay.cakto.com.br/3frhhks", period: "trimestral" }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Separar plano anual dos outros
  const annualPlan = useMemo(() => plans.find(p => p.period === 'anual'), [plans]);
  const otherPlans = useMemo(() => plans.filter(p => p.period !== 'anual'), [plans]);

  const handleSubscribe = async (planId: string) => {
    try {
      const isAuthenticated = !!tokenStorage.get();
      const user = userStorage.get() as { email?: string; name?: string; cpf_cnpj?: string } | null;
      
      if (isAuthenticated && user) {
        await caktoService.redirectToCheckout({
          email: user.email,
          name: user.name,
          cpf_cnpj: user.cpf_cnpj,
          plan: planId,
        });
      } else {
        await caktoService.redirectToCheckout({
          plan: planId,
        });
      }
    } catch (error) {
      console.error('Erro ao redirecionar para checkout:', error);
      toast({
        title: "Erro ao acessar página de assinatura",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  return (
    <section id="pricing" className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Urgency Timer - Destacado acima da seção */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <UrgencyTimer />
        </motion.div>

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
            {plans.length > 1 
              ? "Escolha o plano ideal para o seu negócio."
              : "Um único plano com tudo que você precisa para começar."
            }
          </p>
        </motion.div>

        {/* Pricing Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Carregando planos...</span>
          </div>
        ) : plans.length > 0 ? (
          <div className="max-w-6xl mx-auto">
            {/* Layout Equilibrado: Cards uniformes com destaque sutil no anual */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Card Mensal */}
              {otherPlans.find(p => p.period === 'mensal') && (() => {
                const plan = otherPlans.find(p => p.period === 'mensal')!;
                const price = getPlanPrice(plan.period);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex"
                  >
                    <div className="glass-card rounded-2xl p-6 border-2 border-border hover:border-accent/40 transition-all relative overflow-hidden w-full flex flex-col h-full">
                      <div className="relative z-10 flex-1 flex flex-col">
                        <div className="mb-5">
                          <h3 className="font-display font-bold text-xl text-foreground mb-1">
                            {plan.name}
                          </h3>
                          <p className="text-muted-foreground text-sm capitalize">
                            {plan.period}
                          </p>
                        </div>

                        <div className="mb-6">
                          <div className="flex items-baseline gap-2">
                            <span className="font-display text-4xl font-bold text-foreground">R$ {price.toLocaleString('pt-BR')}</span>
                            <span className="text-muted-foreground text-base">
                              /mês
                            </span>
                          </div>
                        </div>

                        <Button 
                          variant="outline" 
                          size="lg" 
                          className="w-full mb-6"
                          onClick={() => handleSubscribe(plan.id)}
                        >
                          Assinar Agora
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>

                        <div className="space-y-3 mb-6 flex-1">
                          {features.slice(0, 6).map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                              <span className="text-foreground text-sm leading-relaxed">{feature}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-4 border-t border-border mt-auto">
                          <p className="text-xs text-muted-foreground text-center">
                            ✓ 7 dias de Garantia • ✓ Cancele quando quiser
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

              {/* Card Principal - Plano Anual (Destaque Sutil) */}
              {annualPlan && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex"
                >
                  <div className="glass-card rounded-2xl p-7 border-2 border-accent/40 relative overflow-hidden shadow-lg shadow-accent/10 hover:shadow-accent/20 transition-all w-full flex flex-col h-full">
                    {/* Premium Glow Effect - Sutil */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-accent/4 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10 flex-1 flex flex-col">
                      {/* Header com Badge */}
                      <div className="mb-5 relative">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            <h3 className="font-display font-bold text-2xl text-foreground mb-1">
                              {annualPlan.name}
                            </h3>
                          </div>
                          {/* Badge Premium - Posicionado ao lado do título */}
                          <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-accent to-accent/80 text-accent-foreground text-xs font-bold shadow-md flex items-center gap-1.5 flex-shrink-0">
                            <Sparkles className="w-3.5 h-3.5" />
                            MELHOR VALOR
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm capitalize">
                          {annualPlan.period}
                        </p>
                      </div>

                      {/* Preço e Economia */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-sm text-muted-foreground line-through">
                            R$ 804
                          </span>
                          <span className="font-display text-5xl font-bold text-foreground">
                            R$ {getPlanPrice(annualPlan.period).toLocaleString('pt-BR')}
                          </span>
                          <span className="text-muted-foreground text-lg">/ano</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 font-semibold text-sm">
                            Economize R$ {calculateAnnualSavings().toLocaleString('pt-BR')}/ano
                          </span>
                          <span className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent font-bold text-sm">
                            52% OFF
                          </span>
                        </div>

                        <p className="text-muted-foreground text-sm">
                          Apenas <span className="font-semibold text-foreground">R$ {getAnnualMonthlyEquivalent().toFixed(2).replace('.', ',')}/mês</span>
                        </p>
                      </div>

                      <Button 
                        variant="hero" 
                        size="lg" 
                        className="w-full mb-6 shadow-glow hover:shadow-[0_0_40px_hsl(173_80%_40%_/_0.3)]"
                        onClick={() => handleSubscribe(annualPlan.id)}
                      >
                        Assinar Plano Anual
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>

                      {/* Lista de Benefícios */}
                      <div className="space-y-3 mb-6 flex-1">
                        {features.map((feature, featureIndex) => (
                          <div 
                            key={featureIndex} 
                            className="flex items-center gap-2"
                          >
                            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3.5 h-3.5 text-accent" />
                            </div>
                            <span className="text-foreground text-sm font-medium">{feature}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-accent/20 mt-auto">
                        <p className="text-xs text-muted-foreground text-center">
                          ✓ 7 dias de Garantia • ✓ Cancele quando quiser
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Card Trimestral */}
              {otherPlans.find(p => p.period === 'trimestral') && (() => {
                const plan = otherPlans.find(p => p.period === 'trimestral')!;
                const price = getPlanPrice(plan.period);
                const isBest = isBestOffer(plan.id);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex"
                  >
                    <div className="glass-card rounded-2xl p-6 border-2 border-border hover:border-accent/40 transition-all relative overflow-hidden w-full flex flex-col h-full">
                      <div className="relative z-10 flex-1 flex flex-col">
                        <div className="mb-5">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <h3 className="font-display font-bold text-xl text-foreground mb-1">
                                {plan.name}
                              </h3>
                            </div>
                            {isBest && (
                              <div className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold flex-shrink-0">
                                MAIS POPULAR
                              </div>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm capitalize">
                            {plan.period}
                          </p>
                        </div>

                        <div className="mb-6">
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-sm text-muted-foreground line-through">
                              R$ 201
                            </span>
                            <span className="font-display text-4xl font-bold text-foreground">R$ {price.toLocaleString('pt-BR')}</span>
                          </div>
                          <span className="text-muted-foreground text-base">
                            /trimestre
                          </span>
                          {isBest && (
                            <div className="mt-2">
                              <span className="px-2 py-1 rounded bg-accent/10 text-accent text-xs font-semibold">
                                31% OFF
                              </span>
                            </div>
                          )}
                        </div>

                        <Button 
                          variant="outline" 
                          size="lg" 
                          className="w-full mb-6"
                          onClick={() => handleSubscribe(plan.id)}
                        >
                          Assinar Agora
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>

                        <div className="space-y-3 mb-6 flex-1">
                          {features.slice(0, 6).map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                              <span className="text-foreground text-sm leading-relaxed">{feature}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-4 border-t border-border mt-auto">
                          <p className="text-xs text-muted-foreground text-center">
                            ✓ 7 dias de Garantia • ✓ Cancele quando quiser
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <div className="glass-card rounded-3xl p-8 border-2 border-accent/30 relative overflow-hidden">
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Não foi possível carregar os planos. Tente novamente mais tarde.
                </p>
              </div>
            </div>
          </div>
        )}

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
