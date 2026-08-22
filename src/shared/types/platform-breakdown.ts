/** Veiculação por plataforma (Instagram vs Facebook) — vem da Marketing API. */

export interface PlatformTotals {
  platform: string;
  spend: number;
  clicks: number;
  impressions: number;
  commission: number;
  revenue: number;
  orders: number;
  profit: number;
  roas: number | null;
  cpc: number | null;
  spend_share: number;
}

export interface PlatformDailyPoint {
  date: string;
  platform: string;
  spend: number;
  clicks: number;
  impressions: number;
}

export interface PlatformCampaignRow {
  campaign_id: number;
  campaign_name: string;
  sub_id: string | null;
  platform: string;
  spend: number;
  clicks: number;
  impressions: number;
}

export interface PlatformBreakdown {
  has_data: boolean;
  totals: PlatformTotals[];
  daily: PlatformDailyPoint[];
  by_campaign: PlatformCampaignRow[];
  total_spend: number;
}
