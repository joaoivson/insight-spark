import { getApiUrl } from "@/core/config/api.config";
import type { AdSpend } from "@/shared/types/adspend";

export type AdSpendPayload = {
  date: string;
  amount: number;
  sub_id?: string | null;
};

export const bulkCreateAdSpends = async (items: AdSpendPayload[], userId?: string | number | null): Promise<AdSpend[]> => {
  const params = userId ? `?user_id=${userId}` : "";
  const url = getApiUrl(`/api/v1/ad_spends/bulk${params}`);
  const res = await fetch(url, {
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

export const listAdSpends = async (opts: { userId?: string | number | null; startDate?: string; endDate?: string } = {}): Promise<AdSpend[]> => {
  const params = new URLSearchParams();
  if (opts.userId) params.set("user_id", String(opts.userId));
  if (opts.startDate) params.set("start_date", opts.startDate);
  if (opts.endDate) params.set("end_date", opts.endDate);

  const url = getApiUrl(`/api/v1/ad_spends?${params.toString()}`);
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao carregar investimentos");
  }
  return (await res.json()) as AdSpend[];
};

export const createAdSpend = async (payload: AdSpendPayload, userId?: string | number | null): Promise<AdSpend> => {
  const params = userId ? `?user_id=${userId}` : "";
  const url = getApiUrl(`/api/v1/ad_spends${params}`);
  const res = await fetch(url, {
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

export const updateAdSpend = async (id: number, payload: Partial<AdSpendPayload>, userId?: string | number | null): Promise<AdSpend> => {
  const params = userId ? `?user_id=${userId}` : "";
  const url = getApiUrl(`/api/v1/ad_spends/${id}${params}`);
  const res = await fetch(url, {
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

export const deleteAdSpend = async (id: number, userId?: string | number | null): Promise<void> => {
  const params = userId ? `?user_id=${userId}` : "";
  const url = getApiUrl(`/api/v1/ad_spends/${id}${params}`);
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao remover investimento");
  }
};
