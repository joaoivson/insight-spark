import { getApiUrl, fetchPublic } from "@/core/config/api.config";

export interface PlanInfo {
  id: string; // "principal", "trimestral", "anual"
  name: string;
  checkout_url: string;
  period: string; // "mensal", "trimestral", "anual"
}

export interface PlansResponse {
  plans: PlanInfo[];
}

export interface CheckoutUrlParams {
  email?: string;  // Opcional para site institucional
  name?: string;
  cpf_cnpj?: string;
  telefone?: string;
  plan?: string; // ID do plano: "principal", "trimestral", "anual"
}

export interface CheckoutUrlResponse {
  checkout_url: string;
}

const CAKTO_CHECKOUT_BASE_URL = 'https://pay.cakto.com.br/8e9qxyg_742442';

/**
 * Obtém o preço de um plano baseado no período
 */
export const getPlanPrice = (period: string): number => {
  const prices: Record<string, number> = {
    'anual': 447,
    'trimestral': 147,
    'mensal': 67,
  };
  return prices[period.toLowerCase()] || 67; // Default: mensal
};

/**
 * Verifica se um plano é a "Melhor Oferta" (trimestral)
 */
export const isBestOffer = (planId: string): boolean => {
  return planId === 'trimestral';
};

/**
 * Calcula a economia do plano anual comparado ao mensal
 */
export const calculateAnnualSavings = (): number => {
  const monthlyYearly = 67 * 12; // 804
  const annualPrice = 447;
  return monthlyYearly - annualPrice; // 357
};

/**
 * Calcula o equivalente mensal do plano anual
 */
export const getAnnualMonthlyEquivalent = (): number => {
  return 447 / 12; // 37.25
};

export const caktoService = {
  /**
   * Obtém lista de planos disponíveis
   * Pode ser chamado sem autenticação (para site institucional)
   */
  async getPlans(): Promise<PlanInfo[]> {
    const url = getApiUrl("/api/v1/cakto/plans");
    const res = await fetchPublic(url, { method: "GET" });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || error.message || "Erro ao buscar planos");
    }
    
    const data: PlansResponse = await res.json();
    return data.plans;
  },

  /**
   * Obtém URL de checkout da Cakto
   * Pode ser chamado sem autenticação (para site institucional)
   */
  async getCheckoutUrl(params: CheckoutUrlParams = {}): Promise<string> {
    const queryParams = new URLSearchParams();
    
    if (params.email) {
      queryParams.append('email', params.email);
    }
    
    if (params.name) {
      queryParams.append('name', params.name);
    }
    
    if (params.cpf_cnpj) {
      queryParams.append('cpf_cnpj', params.cpf_cnpj);
    }
    
    if (params.telefone) {
      queryParams.append('telefone', params.telefone);
    }
    
    if (params.plan) {
      queryParams.append('plan', params.plan);
    }
    
    // Para site institucional, não precisa de token
    const endpoint = `/api/v1/cakto/checkout-url${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const url = getApiUrl(endpoint);
    
    // Usa fetchPublic para não requerer autenticação
    const res = await fetchPublic(url, { method: "GET" });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || error.message || "Erro ao gerar URL de checkout");
    }
    
    const data: CheckoutUrlResponse = await res.json();
    return data.checkout_url;
  },
  
  /**
   * Redireciona para página de checkout da Cakto
   * Usado no site institucional e na plataforma
   */
  async redirectToCheckout(params: CheckoutUrlParams = {}): Promise<void> {
    const checkoutUrl = await this.getCheckoutUrl(params);
    window.location.href = checkoutUrl;
  },
  
  /**
   * Redireciona diretamente para checkout (sem pré-preenchimento)
   * Usado no botão "Assinar" do site institucional
   */
  redirectToCheckoutDirect(): void {
    window.location.href = CAKTO_CHECKOUT_BASE_URL;
  },

};
