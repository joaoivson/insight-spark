import { create } from "zustand";
import { listCampaigns, type CampaignListParams } from "@/services/campaigns.service";
import type { Campaign, CampaignKPIs } from "@/shared/types/campaign";

const EMPTY_KPIS: CampaignKPIs = {
  avg_cpc: null,
  total_spend: 0,
  total_spend_with_tax: 0,
  total_commission: 0,
  total_commission_net: 0,
  total_profit: 0,
  avg_roas: 0,
  total_daily_budget: 0,
};

type CampaignsState = {
  campaigns: Campaign[];
  kpis: CampaignKPIs;
  hasTax: boolean;
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  fetch: (params?: CampaignListParams) => Promise<void>;
  // Atualiza uma campanha em memória após uma mutação (link/status/budget)
  patchCampaign: (id: number, patch: Partial<Campaign>) => void;
};

export const useCampaignsStore = create<CampaignsState>((set, get) => ({
  campaigns: [],
  kpis: EMPTY_KPIS,
  hasTax: false,
  loading: false,
  error: null,
  hydrated: false,

  fetch: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await listCampaigns(params);
      set({ campaigns: data.campaigns, kpis: data.kpis, hasTax: data.has_tax, hydrated: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao carregar campanhas";
      set({ error: message });
    } finally {
      set({ loading: false });
    }
  },

  patchCampaign: (id, patch) => {
    set({ campaigns: get().campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  },
}));
