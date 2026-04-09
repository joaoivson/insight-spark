import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";

export interface SubscriptionStatus {
  has_subscription: boolean;
  is_active: boolean;
  plan: string | null;
  needs_validation: boolean;
  last_validation_at: string | null;
  expires_at: string | null;
  // Provider-agnostic fields
  provider: string | null;
  provider_customer_id: string | null;
  provider_status: string | null;
  provider_offer_name: string | null;
  provider_due_date: string | null;
  provider_subscription_status: string | null;
  provider_payment_status: string | null;
  provider_payment_method: string | null;
  provider_order_id: string | null;
  // Legacy Cakto fields (backward compat)
  cakto_customer_id: string | null;
  cakto_status: string | null;
  cakto_offer_name: string | null;
  cakto_due_date: string | null;
  cakto_subscription_status: string | null;
  cakto_payment_status: string | null;
  cakto_payment_method: string | null;
  cakto_next_payment_date: string | null;
}

// GET /api/v1/subscription/status
export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  const url = getApiUrl("/api/v1/subscription/status");
  const res = await fetchWithAuth(url, { method: "GET" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || error.message || "Erro ao verificar assinatura");
  }
  return res.json();
};
