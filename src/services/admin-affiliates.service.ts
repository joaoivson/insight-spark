import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";

export interface PendingAffiliate {
  referrer_user_id: number;
  name: string | null;
  email: string;
  pix_key: string | null;
  total_pending: string;
  commissions_count: number;
  commission_ids: number[];
}

export interface MarkPaidResponse {
  paid_count: number;
  total_paid: string;
}

export async function getPendingAffiliates(): Promise<PendingAffiliate[]> {
  const res = await fetchWithAuth(getApiUrl("/api/v1/admin/affiliates/pending"));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao listar afiliados pendentes");
  }
  return res.json();
}

export async function markCommissionsPaid(
  commissionIds: number[],
  paymentReference: string,
): Promise<MarkPaidResponse> {
  const res = await fetchWithAuth(getApiUrl("/api/v1/admin/commissions/pay"), {
    method: "POST",
    body: JSON.stringify({
      commission_ids: commissionIds,
      payment_reference: paymentReference,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao marcar como pago");
  }
  return res.json();
}
