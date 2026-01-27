import { useState } from "react";
import { caktoService } from "@/services/cakto.service";
import { tokenStorage, userStorage } from "@/shared/lib/storage";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook compartilhado para lidar com assinatura/checkout
 * Centraliza a lógica de redirecionamento para Cakto
 */
export const useSubscribe = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (scrollToPricing = true) => {
    try {
      setLoading(true);

      // Se scrollToPricing é true, tenta scrollar para a seção de preços primeiro
      if (scrollToPricing) {
        const pricingSection = document.getElementById('pricing');
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Aguarda um pouco antes de redirecionar (opcional)
          return;
        }
      }

      // Verifica se usuário está autenticado
      const isAuthenticated = !!tokenStorage.get();
      const user = userStorage.get() as { email?: string; name?: string; cpf_cnpj?: string } | null;

      if (isAuthenticated && user) {
        await caktoService.redirectToCheckout({
          email: user.email,
          name: user.name,
          cpf_cnpj: user.cpf_cnpj,
        });
      } else {
        await caktoService.redirectToCheckoutDirect();
      }
    } catch (error) {
      console.error('Erro ao redirecionar para checkout:', error);
      toast({
        title: "Erro ao acessar página de assinatura",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    handleSubscribe,
    loading,
  };
};
