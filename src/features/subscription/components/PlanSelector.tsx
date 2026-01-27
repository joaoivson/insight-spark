import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { PlanInfo, getPlanPrice, isBestOffer, calculateAnnualSavings, getAnnualMonthlyEquivalent } from "@/services/cakto.service";
import { Button } from "@/components/ui/button";

interface PlanSelectorProps {
  plans: PlanInfo[];
  selectedPlan: string;
  onSelectPlan: (planId: string) => void;
  highlightBestOffer?: boolean;
  showPrices?: boolean;
  variant?: 'default' | 'compact' | 'modal';
}

export const PlanSelector = ({
  plans,
  selectedPlan,
  onSelectPlan,
  highlightBestOffer = true,
  showPrices = true,
  variant = 'default',
}: PlanSelectorProps) => {
  // Separar plano anual dos outros
  const annualPlan = plans.find(p => p.period === 'anual');
  const otherPlans = plans.filter(p => p.period !== 'anual');

  if (variant === 'compact') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const price = getPlanPrice(plan.period);
          const isBest = isBestOffer(plan.id);
          const isSelected = selectedPlan === plan.id;
          const isAnnual = plan.period === 'anual';

          return (
            <motion.button
              key={plan.id}
              type="button"
              onClick={() => onSelectPlan(plan.id)}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50 bg-card"
              } ${isAnnual ? 'md:col-span-2' : ''}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    {isSelected && (
                      <Check className="w-4 h-4 text-accent" />
                    )}
                    {isBest && highlightBestOffer && (
                      <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                        MELHOR OFERTA
                      </span>
                    )}
                    {isAnnual && (
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-accent to-accent/80 text-accent-foreground text-xs font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        MELHOR VALOR
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">
                    {plan.period}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? "border-accent bg-accent"
                    : "border-border"
                }`}>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-accent-foreground" />
                  )}
                </div>
              </div>
              {showPrices && (
                <div className="mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">
                      R$ {price.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {plan.period === "mensal" ? "/mês" : 
                       plan.period === "trimestral" ? "/trimestre" : 
                       "/ano"}
                    </span>
                  </div>
                  {isAnnual && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Equivale a R$ {getAnnualMonthlyEquivalent().toFixed(2).replace('.', ',')}/mês
                    </div>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="space-y-4">
        {/* Plano Anual em Destaque */}
        {annualPlan && (
          <motion.button
            type="button"
            onClick={() => onSelectPlan(annualPlan.id)}
            className={`relative w-full p-6 rounded-xl border-2 transition-all text-left ${
              selectedPlan === annualPlan.id
                ? "border-accent bg-accent/10 shadow-lg"
                : "border-border hover:border-accent/50 bg-card"
            }`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-accent to-accent/80 text-accent-foreground text-xs font-bold flex items-center gap-1 z-10">
              <Sparkles className="w-3 h-3" />
              RECOMENDADO
            </div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-xl text-foreground mb-1">
                  {annualPlan.name}
                </h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {annualPlan.period}
                </p>
              </div>
              {selectedPlan === annualPlan.id && (
                <Check className="w-6 h-6 text-accent" />
              )}
            </div>
            {showPrices && (
              <div className="mb-4">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-foreground">
                    R$ {getPlanPrice(annualPlan.period).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-muted-foreground">/ano</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="px-2 py-1 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-semibold">
                    Economize R$ {calculateAnnualSavings().toLocaleString('pt-BR')}/ano
                  </div>
                  <div className="text-muted-foreground">
                    Apenas <span className="font-semibold text-foreground">R$ {getAnnualMonthlyEquivalent().toFixed(2).replace('.', ',')}/mês</span>
                  </div>
                </div>
              </div>
            )}
          </motion.button>
        )}

        {/* Outros Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {otherPlans.map((plan) => {
            const price = getPlanPrice(plan.period);
            const isBest = isBestOffer(plan.id);
            const isSelected = selectedPlan === plan.id;

            return (
              <motion.button
                key={plan.id}
                type="button"
                onClick={() => onSelectPlan(plan.id)}
                className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50 bg-card"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      {isSelected && (
                        <Check className="w-4 h-4 text-accent" />
                      )}
                      {isBest && highlightBestOffer && (
                        <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                          MELHOR OFERTA
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {plan.period}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? "border-accent bg-accent"
                      : "border-border"
                  }`}>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-accent-foreground" />
                    )}
                  </div>
                </div>
                {showPrices && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">
                      R$ {price.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {plan.period === "mensal" ? "/mês" : "/trimestre"}
                    </span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // Variant default - similar ao compact mas com mais espaço
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const price = getPlanPrice(plan.period);
        const isBest = isBestOffer(plan.id);
        const isSelected = selectedPlan === plan.id;
        const isAnnual = plan.period === 'anual';

        return (
          <motion.button
            key={plan.id}
            type="button"
            onClick={() => onSelectPlan(plan.id)}
            className={`relative p-6 rounded-xl border-2 transition-all text-left ${
              isSelected
                ? "border-accent bg-accent/10 shadow-lg"
                : "border-border hover:border-accent/50 bg-card"
            } ${isAnnual ? 'md:col-span-2' : ''}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                  {isSelected && (
                    <Check className="w-5 h-5 text-accent" />
                  )}
                  {isBest && highlightBestOffer && (
                    <span className="px-2 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                      MELHOR OFERTA
                    </span>
                  )}
                  {isAnnual && (
                    <span className="px-2 py-1 rounded-full bg-gradient-to-r from-accent to-accent/80 text-accent-foreground text-xs font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      MELHOR VALOR
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {plan.period}
                </p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                isSelected
                  ? "border-accent bg-accent"
                  : "border-border"
              }`}>
                {isSelected && (
                  <div className="w-3 h-3 rounded-full bg-accent-foreground" />
                )}
              </div>
            </div>
            {showPrices && (
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className={`font-bold text-foreground ${isAnnual ? 'text-3xl' : 'text-2xl'}`}>
                    R$ {price.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-muted-foreground">
                    {plan.period === "mensal" ? "/mês" : 
                     plan.period === "trimestral" ? "/trimestre" : 
                     "/ano"}
                  </span>
                </div>
                {isAnnual && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Equivale a R$ {getAnnualMonthlyEquivalent().toFixed(2).replace('.', ',')}/mês
                  </div>
                )}
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
