import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";

export interface ClickRow {
  id: number;
  dataset_id: number;
  user_id: number;
  date: string;
  channel: string;
  sub_id: string;
  clicks: number;
}

export type ClickQuery = {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export const fetchClickRows = async (query: ClickQuery = {}): Promise<ClickRow[]> => {
  const params = new URLSearchParams();
  if (query.startDate) params.set("start_date", query.startDate);
  if (query.endDate) params.set("end_date", query.endDate);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));

  const url = getApiUrl(`/api/v1/clicks/all/rows?${params.toString()}`);
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao carregar dados de cliques");
  }
  const data = await res.json();
  return data as ClickRow[];
};

export const deleteAllClicks = async (): Promise<void> => {
  const url = getApiUrl(`/api/v1/clicks/all`);
  const res = await fetchWithAuth(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao remover todos os dados de cliques");
  }
};
