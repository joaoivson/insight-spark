/**
 * Serviço genérico de pagamento.
 *
 * Facade que delega para o provider ativo (Cakto ou Kiwify) conforme feature flag.
 * Mantém a mesma interface do caktoService para facilitar a migração.
 */

import { getApiUrl, fetchPublic } from "@/core/config/api.config";
import { isKiwify } from "@/core/config/feature-flags";

export interface PlanInfo {
  id: string;
  name: string;
  checkout_url: string;
  period: string;
}

export interface PlansResponse {
  plans: PlanInfo[];
}

export interface CheckoutUrlParams {
  email?: string;
  name?: string;
  cpf_cnpj?: string;
  telefone?: string;
  plan?: string;
}

export interface CheckoutUrlResponse {
  checkout_url: string;
}

// URLs diretas de fallback por provider
const KIWIFY_CHECKOUT_DIRECT_URL = "https://pay.kiwify.com.br/u12boOS";
const CAKTO_CHECKOUT_DIRECT_URL = "https://pay.cakto.com.br/8e9qxyg_742442";

/**
 * Retorna o preço de um plano baseado no período.
 * Preços iguais para ambos os providers.
 */
export const getPlanPrice = (period: string): number => {
  const prices: Record<string, number> = {
    anual: 447,
    trimestral: 147,
    mensal: 67,
  };
  return prices[period.toLowerCase()] || 67;
};

export const isBestOffer = (planId: string): boolean => {
  return planId === "trimestral";
};

export const calculateAnnualSavings = (): number => {
  return 67 * 12 - 447; // 357
};

export const getAnnualMonthlyEquivalent = (): number => {
  return 447 / 12; // 37.25
};

/**
 * Retorna URL do portal do cliente do provider ativo.
 */
export const getCustomerPortalUrl = (): string => {
  return isKiwify()
    ? "https://dashboard.kiwify.com.br"
    : "https://www.cakto.com.br/area-do-cliente";
};

export const paymentService = {
  /**
   * Obtém lista de planos disponíveis do provider ativo.
   */
  async getPlans(): Promise<PlanInfo[]> {
    const url = getApiUrl("/api/v1/payment/plans");
    const res = await fetchPublic(url, { method: "GET" });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || error.message || "Erro ao buscar planos");
    }

    const data: PlansResponse = await res.json();
    return data.plans;
  },

  /**
   * Obtém URL de checkout do provider ativo.
   */
  async getCheckoutUrl(params: CheckoutUrlParams = {}): Promise<string> {
    const queryParams = new URLSearchParams();

    if (params.email) queryParams.append("email", params.email);
    if (params.name) queryParams.append("name", params.name);
    if (params.cpf_cnpj) queryParams.append("cpf_cnpj", params.cpf_cnpj);
    if (params.telefone) queryParams.append("telefone", params.telefone);
    if (params.plan) queryParams.append("plan", params.plan);

    const qs = queryParams.toString();
    const endpoint = `/api/v1/payment/checkout-url${qs ? `?${qs}` : ""}`;
    const url = getApiUrl(endpoint);
    const res = await fetchPublic(url, { method: "GET" });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || error.message || "Erro ao gerar URL de checkout");
    }

    const data: CheckoutUrlResponse = await res.json();
    return data.checkout_url;
  },

  /**
   * Redireciona para página de checkout do provider ativo.
   */
  async redirectToCheckout(params: CheckoutUrlParams = {}): Promise<void> {
    const checkoutUrl = await this.getCheckoutUrl(params);
    window.location.href = checkoutUrl;
  },

  /**
   * Redireciona diretamente para checkout (sem pré-preenchimento).
   */
  redirectToCheckoutDirect(): void {
    window.location.href = isKiwify()
      ? KIWIFY_CHECKOUT_DIRECT_URL
      : CAKTO_CHECKOUT_DIRECT_URL;
  },
};
