import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";
import type { AdSpend } from "@/shared/types/adspend";

export type AdSpendPayload = {
  date: string;
  amount: number;
  sub_id?: string | null;
};

export const bulkCreateAdSpends = async (items: AdSpendPayload[]): Promise<AdSpend[]> => {
  const url = getApiUrl(`/api/v1/ad_spends/bulk`);
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao importar investimentos");
  }
  return (await res.json()) as AdSpend[];
};

export const listAdSpends = async (opts: { startDate?: string; endDate?: string } = {}): Promise<AdSpend[]> => {
  const params = new URLSearchParams();
  // Removido user_id da query - agora vem do token
  if (opts.startDate) params.set("start_date", opts.startDate);
  if (opts.endDate) params.set("end_date", opts.endDate);

  const url = getApiUrl(`/api/v1/ad_spends?${params.toString()}`);
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao carregar investimentos");
  }
  return (await res.json()) as AdSpend[];
};

export const createAdSpend = async (payload: AdSpendPayload): Promise<AdSpend> => {
  const url = getApiUrl(`/api/v1/ad_spends`);
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao criar investimento");
  }
  return (await res.json()) as AdSpend;
};

export const updateAdSpend = async (id: number, payload: Partial<AdSpendPayload>): Promise<AdSpend> => {
  const url = getApiUrl(`/api/v1/ad_spends/${id}`);
  const res = await fetchWithAuth(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao atualizar investimento");
  }
  return (await res.json()) as AdSpend;
};

export const deleteAdSpend = async (id: number): Promise<void> => {
  const url = getApiUrl(`/api/v1/ad_spends/${id}`);
  const res = await fetchWithAuth(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao remover investimento");
  }
};
