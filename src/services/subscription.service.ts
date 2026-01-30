import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";

export interface SubscriptionStatus {
  has_subscription: boolean;
  is_active: boolean;
  plan: string | null;
  needs_validation: boolean;
  last_validation_at: string | null;
  expires_at: string | null;
  cakto_customer_id: string | null;
  cakto_status: string | null;
  cakto_offer_name: string | null;
  cakto_due_date: string | null;
  cakto_subscription_status: string | null;
  cakto_payment_status: string | null;
  cakto_payment_method: string | null;
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
