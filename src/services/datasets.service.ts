import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";
import type { DatasetRow } from "@/components/dashboard/DataTable";

export type DatasetQuery = {
  userId?: string | number | null;
  startDate?: string;
  endDate?: string;
  includeRawData?: boolean;
  limit?: number;
  offset?: number;
};

export const fetchDatasetRows = async (query: DatasetQuery = {}): Promise<DatasetRow[]> => {
  const params = new URLSearchParams();
  // Removido user_id da query - agora vem do token
  if (query.startDate) params.set("start_date", query.startDate);
  if (query.endDate) params.set("end_date", query.endDate);
  if (query.includeRawData) params.set("include_raw_data", "true");
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));

  const url = getApiUrl(`/api/v1/datasets/all/rows?${params.toString()}`);
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao carregar dados");
  }
  const data = await res.json();
  return Array.isArray(data?.rows) ? (data.rows as DatasetRow[]) : (data as DatasetRow[]);
};

export const deleteAllDatasets = async (): Promise<void> => {
  const url = getApiUrl(`/api/v1/datasets/all`);
  const res = await fetchWithAuth(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Falha ao remover todos os dados de vendas");
  }
};
