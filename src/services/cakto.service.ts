import { getApiUrl, fetchPublic } from "@/core/config/api.config";

export interface CheckoutUrlParams {
  email?: string;  // Opcional para site institucional
  name?: string;
  cpf_cnpj?: string;
  telefone?: string;
}

export interface CheckoutUrlResponse {
  checkout_url: string;
}

const CAKTO_CHECKOUT_BASE_URL = 'https://pay.cakto.com.br/8e9qxyg_742442';

export const caktoService = {
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
