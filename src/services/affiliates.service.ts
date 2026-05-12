import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";

export interface AffiliateCommission {
  id: number;
  referred_email: string;
  amount: string; // Decimal vindo do backend serializado como string
  base_amount: string;
  rate: string;
  status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  payment_reference: string | null;
  created_at: string;
}

export interface AffiliateSummary {
  ref_link: string;
  balance_pending: string;
  total_paid: string;
  referrals_count: number;
  active_referrals_count: number;
  commissions: AffiliateCommission[];
}

export async function getMyAffiliateSummary(): Promise<AffiliateSummary> {
  const res = await fetchWithAuth(getApiUrl("/api/v1/affiliates/me"));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao carregar afiliados");
  }
  return res.json();
}
