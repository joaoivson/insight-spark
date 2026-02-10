import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlanSelector } from "./PlanSelector";
import { caktoService, PlanInfo } from "@/services/cakto.service";
import { userStorage } from "@/shared/lib/storage";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanSelected?: (planId: string) => void;
  initialPlanId?: string;
  customerData?: {
    name?: string;
    email?: string;
    cpf_cnpj?: string;
    telefone?: string;
  };
}

export const SubscriptionPlanModal = ({
  open,
  onOpenChange,
  onPlanSelected,
  initialPlanId,
  customerData,
}: SubscriptionPlanModalProps) => {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plansList = await caktoService.getPlans();
        // Ordenar: anual primeiro
        const sortedPlans = [...plansList].sort((a, b) => {
          const order: Record<string, number> = { 'anual': 0, 'mensal': 1, 'trimestral': 2 };
          return (order[a.period] ?? 99) - (order[b.period] ?? 99);
        });
        setPlans(sortedPlans);

        const resolveInitialPlan = () => {
          if (!sortedPlans.length) {
            return "";
          }

          if (initialPlanId) {
            const matchedPlan = sortedPlans.find(plan => plan.id === initialPlanId);
            if (matchedPlan) {
              return matchedPlan.id;
            }
          }

          const annualPlan = sortedPlans.find(plan => plan.period === 'anual');
          if (annualPlan) {
            return annualPlan.id;
          }

          return sortedPlans[0].id;
        };

        setSelectedPlan(resolveInitialPlan());
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
        toast({
          title: "Erro ao carregar planos",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      setLoading(true);
      fetchPlans();
    }
  }, [open, toast, initialPlanId]);

  useEffect(() => {
    if (!open) {
      setRedirecting(false);
    }
  }, [open]);

  const handleContinue = async () => {
    if (!selectedPlan) {
      toast({
        title: "Selecione um plano",
        description: "Por favor, escolha um plano antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setRedirecting(true);
      const storedUser = userStorage.get() as { email?: string; name?: string; cpf_cnpj?: string; telefone?: string } | null;

      if (onPlanSelected) {
        onPlanSelected(selectedPlan);
      }

      const mergedData = {
        name: customerData?.name?.trim() || storedUser?.name,
        email: customerData?.email?.trim() || storedUser?.email,
        cpf_cnpj: customerData?.cpf_cnpj
          ? customerData.cpf_cnpj.replace(/\D/g, "")
          : storedUser?.cpf_cnpj,
        telefone: customerData?.telefone
          ? customerData.telefone.replace(/\D/g, "")
          : storedUser?.telefone,
      };

      const checkoutPayload: Record<string, string> = { plan: selectedPlan };

      if (mergedData.email) {
        checkoutPayload.email = mergedData.email;
      }

      if (mergedData.name) {
        checkoutPayload.name = mergedData.name;
      }

      if (mergedData.cpf_cnpj) {
        checkoutPayload.cpf_cnpj = mergedData.cpf_cnpj;
      }

      if (mergedData.telefone) {
        checkoutPayload.telefone = mergedData.telefone;
      }

      await caktoService.redirectToCheckout(checkoutPayload);
    } catch (error) {
      console.error('Erro ao redirecionar para checkout:', error);
      toast({
        title: "Erro ao processar",
        description: error instanceof Error ? error.message : "Não foi possível iniciar o checkout",
        variant: "destructive",
      });
      setRedirecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Ative sua Assinatura
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Você será redirecionado para a Cakto para ativar seu plano. 
            Escolha o plano ideal para você:
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Carregando planos...</span>
            </div>
          ) : plans.length > 0 ? (
            <>
              <PlanSelector
                plans={plans}
                selectedPlan={selectedPlan}
                onSelectPlan={setSelectedPlan}
                highlightBestOffer={true}
                showPrices={true}
                variant="modal"
              />

              {/* Informação sobre redirecionamento */}
              <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-1">
                      Próximo passo
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Ao clicar em "Continuar", você será redirecionado para a página de pagamento da Cakto, 
                      onde poderá finalizar sua assinatura de forma segura.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={redirecting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="hero"
                  onClick={handleContinue}
                  disabled={redirecting || !selectedPlan}
                  className="min-w-[140px]"
                >
                  {redirecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redirecionando...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Não foi possível carregar os planos. Tente novamente mais tarde.
              </p>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="mt-4"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
