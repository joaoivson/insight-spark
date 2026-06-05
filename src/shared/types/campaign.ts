export type CampaignHealth = "healthy" | "warning" | "loss" | "unlinked";

export interface CampaignMetrics {
  spend: number;
  clicks: number;
  impressions: number;
  cpc: number | null;
  ctr: number | null;
  commission: number;
  revenue: number;
  orders: number;
  direct_orders: number;
  profit: number;
  roas: number;
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
  total_commission: number;
  total_profit: number;
  avg_roas: number;
  total_daily_budget: number;
}

export interface CampaignListResponse {
  kpis: CampaignKPIs;
  campaigns: Campaign[];
}

export interface CampaignDailyPoint {
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
  cpc: number | null;
  ctr: number | null;
  commission: number;
  revenue: number;
  orders: number;
  profit: number;
  roas: number;
}

export interface CampaignDetailResponse {
  campaign: Campaign;
  daily: CampaignDailyPoint[];
}

export interface FacebookIntegrationStatus {
  id: number;
  user_id: number;
  fb_user_name: string | null;
  ad_account_id: string | null;
  ad_account_name: string | null;
  is_active: boolean;
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
