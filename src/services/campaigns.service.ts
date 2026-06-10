import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import type {
  Campaign,
  CampaignDetailResponse,
  CampaignListResponse,
  CampaignStatusFilter,
  SubIdOptionsResponse,
} from "@/shared/types/campaign";

export interface CampaignListParams {
  startDate?: string;
  endDate?: string;
  status?: CampaignStatusFilter;
  search?: string;
}

const buildQuery = (params: CampaignListParams): string => {
  const qs = new URLSearchParams();
  if (params.startDate) qs.set("start_date", params.startDate);
  if (params.endDate) qs.set("end_date", params.endDate);
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  const s = qs.toString();
  return s ? `?${s}` : "";
};

export const listCampaigns = async (params: CampaignListParams = {}): Promise<CampaignListResponse> => {
  const url = getApiUrl(`/api/v1/campaigns${buildQuery(params)}`);
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error((await res.text()) || "Erro ao carregar campanhas");
  return (await res.json()) as CampaignListResponse;
};

export const getCampaignDetail = async (
  id: number,
  params: Pick<CampaignListParams, "startDate" | "endDate"> = {},
): Promise<CampaignDetailResponse> => {
  const url = getApiUrl(`/api/v1/campaigns/${id}${buildQuery(params)}`);
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error((await res.text()) || "Erro ao carregar detalhe da campanha");
  return (await res.json()) as CampaignDetailResponse;
};

export const linkCampaign = async (
  id: number,
  subId: string | null,
  range: Pick<CampaignListParams, "startDate" | "endDate"> = {},
): Promise<Campaign> => {
  // Envia o período da tela para o backend recalcular comissão/lucro/ROAS na resposta.
  const url = getApiUrl(`/api/v1/campaigns/${id}/link${buildQuery(range)}`);
  const res = await fetchWithAuth(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sub_id: subId }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Erro ao vincular campanha");
  return (await res.json()) as Campaign;
};

export const getSubIdOptions = async (campaignId: number): Promise<SubIdOptionsResponse> => {
  const url = getApiUrl(`/api/v1/campaigns/${campaignId}/sub-id-options`);
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error((await res.text()) || "Erro ao carregar Sub IDs");
  return (await res.json()) as SubIdOptionsResponse;
};

export const exportCampaigns = async (params: CampaignListParams = {}): Promise<void> => {
  const url = getApiUrl(`/api/v1/campaigns/export${buildQuery(params)}`);
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error((await res.text()) || "Erro ao exportar campanhas");

  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = "campanhas.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
};

export const setCampaignStatus = async (id: number, active: boolean): Promise<Campaign> => {
  const url = getApiUrl(`/api/v1/campaigns/${id}/status`);
  const res = await fetchWithAuth(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Erro ao alterar status da campanha");
  return (await res.json()) as Campaign;
};

export const setCampaignBudget = async (id: number, dailyBudget: number): Promise<Campaign> => {
  const url = getApiUrl(`/api/v1/campaigns/${id}/budget`);
  const res = await fetchWithAuth(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ daily_budget: dailyBudget }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Erro ao alterar orçamento da campanha");
  return (await res.json()) as Campaign;
};
