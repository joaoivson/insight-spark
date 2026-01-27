import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";

export interface SubscriptionStatus {
  is_active: boolean;
  plan: string; // "marketdash" ou "free"
  expires_at: string | null;
  last_validation_at: string | null;
  cakto_customer_id: string | null;
  needs_validation: boolean; // Se precisa validar (passou 30 dias)
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
