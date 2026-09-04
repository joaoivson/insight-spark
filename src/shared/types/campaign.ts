export type CampaignHealth = "healthy" | "warning" | "loss" | "unlinked";

export interface CampaignMetrics {
  spend: number;            // gasto bruto (sem imposto)
  spend_with_tax: number;   // gasto com imposto (= spend se sem imposto)
  clicks: number;
  impressions: number;
  reach: number;
  cpc: number | null;
  ctr: number | null;
  commission: number;       // comissão bruta
  commission_net: number;   // comissão líquida (= commission se sem imposto)
  revenue: number;
  orders: number;
  direct_orders: number;
  profit: number;           // lucro líquido = commission_net - spend_with_tax
  roas: number;             // ROAS Real = commission_net / spend_with_tax
}

export interface Campaign {
  id: number;
  fb_campaign_id: string;
  name: string;
  status: string | null;
  effective_status: string | null;
  objective: string | null;
  daily_budget: number | null;
  sub_id: string | null;
  linked: boolean;
  is_active: boolean;
  health: CampaignHealth;
  metrics: CampaignMetrics;
}

export interface CampaignKPIs {
  avg_cpc: number | null;
  total_spend: number;
  total_spend_with_tax: number;
  total_commission: number;
  total_commission_net: number;
  total_profit: number;
  avg_roas: number;
  total_daily_budget: number;
  active_campaigns_count: number;
}

export interface CampaignListResponse {
  kpis: CampaignKPIs;
  campaigns: Campaign[];
  has_tax: boolean;
}

export interface CampaignDailyPoint {
  date: string;
  spend: number;
  spend_with_tax: number;
  clicks: number;
  impressions: number;
  cpc: number | null;
  ctr: number | null;
  commission: number;
  commission_net: number;
  revenue: number;
  orders: number;
  profit: number;
  roas: number;
  clicks_shopee: number | null;
  cpc_shopee: number | null;
}

export interface CampaignDetailResponse {
  campaign: Campaign;
  daily: CampaignDailyPoint[];
  has_tax: boolean;
}

export type CampaignStatusFilter = "all" | "active" | "paused";

export interface SubIdOption {
  sub_id: string;
  orders: number;
  commission: number;
  suggested: boolean;
  linked_campaign_id: number | null;
  linked_campaign_name: string | null;
}

export interface SubIdOptionsResponse {
  options: SubIdOption[];
}

/** Conta selecionada como o status devolve: id "act_..." + nome e moeda persistidos (null se desconhecidos). */
export interface FacebookSelectedAdAccount {
  id: string;
  name: string | null;
  currency?: string | null;
}

export interface FacebookIntegrationStatus {
  id: number;
  user_id: number;
  fb_user_name: string | null;
  ad_account_id: string | null;
  ad_account_name: string | null;
  ad_account_ids: string[];
  /** Contas SELECIONADAS com nome persistido — não exige chamada à Graph para exibir. */
  ad_accounts?: FacebookSelectedAdAccount[];
  is_active: boolean;
  /** conectado | nunca | desconectado */
  connection_state?: "conectado" | "nunca" | "desconectado";
  last_sync_at: string | null;
  token_expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FacebookAdAccount {
  account_id: string;
  name: string | null;
  currency: string | null;
  account_status: number | null;
  id: string | null;
}
