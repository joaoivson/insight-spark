import { create } from "zustand";
import type { AdSpend } from "@/shared/types/adspend";
import { getScopedKey } from "@/shared/lib/storage";
import { safeGetJSON, safeRemove, safeSetJSON } from "@/utils/storage";
import { createAdSpend, deleteAdSpend, listAdSpends, updateAdSpend, type AdSpendPayload } from "@/services/adspends.service";

type DateRange = { from?: Date | string | null; to?: Date | string | null };

type AdSpendsState = {
  adSpends: AdSpend[]; // The filtered ad spends currently displayed
  fullAdSpends: AdSpend[]; // The source of truth (complete dataset)
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  lastUpdated: number | null;
  fetchAdSpends: (opts?: { range?: DateRange; force?: boolean }) => Promise<AdSpend[]>;
  create: (payload: AdSpendPayload) => Promise<void>;
  update: (id: number, payload: Partial<AdSpendPayload>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  invalidate: () => void;
};

const CACHE_KEY_BASE = "adspends-cache";

const rangeToParams = (range?: DateRange) => {
  const startDate = range?.from ? new Date(range.from as any).toISOString().slice(0, 10) : undefined;
  const endDate = range?.to ? new Date(range.to as any).toISOString().slice(0, 10) : undefined;
  return { startDate, endDate };
};

const getInitialState = () => {
  const cacheKey = getScopedKey(CACHE_KEY_BASE);
  const cached = safeGetJSON<{ adSpends: AdSpend[]; lastUpdated?: number }>(cacheKey);
  if (cached && Array.isArray(cached.adSpends)) {
    return {
      adSpends: cached.adSpends,
      fullAdSpends: cached.adSpends,
      hydrated: true,
      lastUpdated: cached.lastUpdated ?? Date.now(),
    };
  }
  return { adSpends: [], fullAdSpends: [], hydrated: false, lastUpdated: null };
};

export const useAdSpendsStore = create<AdSpendsState>((set, get) => {
  const initial = getInitialState();
  return {
    adSpends: initial.adSpends,
    fullAdSpends: initial.fullAdSpends,
    loading: false,
    error: null,
    hydrated: initial.hydrated,
    lastUpdated: initial.lastUpdated,

    invalidate: () => {
      safeRemove(getScopedKey(CACHE_KEY_BASE));
      set({ adSpends: [], fullAdSpends: [], hydrated: false, lastUpdated: null });
    },

    fetchAdSpends: async (opts = {}) => {
      const cacheKey = getScopedKey(CACHE_KEY_BASE);
      const { fullAdSpends, hydrated, loading } = get();

      // 1. Se já temos dados na memória e não foi forçado, apenas retorna
      if (hydrated && fullAdSpends.length > 0 && !opts.force) {
        set({ adSpends: fullAdSpends });
        return fullAdSpends;
      }

      // 2. Busca da API
      if (loading) return get().adSpends;
      set({ loading: true, error: null });
      
      try {
        // ALWAYS fetch all ad spends for the cache
        const apiData = await listAdSpends(); 

        const now = Date.now();
        // GARANTIA: Seta no estado e NO localStorage IMEDIATAMENTE após o retorno
        set({ 
          adSpends: apiData, 
          fullAdSpends: apiData, 
          hydrated: true, 
          lastUpdated: now 
        });

        localStorage.setItem(cacheKey, JSON.stringify({ 
          adSpends: apiData, 
          lastUpdated: now 
        }));

        return apiData;
      } catch (error: any) {
        set({ error: error?.message || "Erro ao carregar investimentos" });
        return get().adSpends;
      } finally {
        set({ loading: false });
      }
    },

    create: async (payload) => {
      await createAdSpend(payload);
      await get().fetchAdSpends({ force: true });
    },

    update: async (id, payload) => {
      await updateAdSpend(id, payload);
      await get().fetchAdSpends({ force: true });
    },

    remove: async (id) => {
      await deleteAdSpend(id);
      await get().fetchAdSpends({ force: true });
    },
  };
});
