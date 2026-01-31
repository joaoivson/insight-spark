import { create } from "zustand";
import { getUserId } from "@/shared/lib/storage";
import { fetchClickRows, ClickRow } from "@/services/clicks.service";
import { safeGetJSON, safeRemove, safeSetJSON } from "@/utils/storage";

type DateRange = { from?: Date | string | null; to?: Date | string | null };

type ClicksState = {
  clicks: ClickRow[]; // The filtered rows currently displayed
  fullClicks: ClickRow[]; // The source of truth (complete dataset)
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  lastUpdated: number | null;
  fetchClicks: (opts?: { range?: DateRange; force?: boolean; limit?: number; offset?: number }) => Promise<ClickRow[]>;
  invalidate: () => void;
  persist: (clicks: ClickRow[]) => void;
};

const getCacheKey = (userId?: string | number | null) => {
  if (userId) {
    const idStr = String(userId);
    if (idStr.startsWith('user_')) {
      return `clicks-cache:${idStr}`;
    }
    return `clicks-cache:user_${idStr}`;
  }
  return `clicks-cache:anon`;
};

const rangeToParams = (range?: DateRange) => {
  const startDate = range?.from ? new Date(range.from as any).toISOString().slice(0, 10) : undefined;
  const endDate = range?.to ? new Date(range.to as any).toISOString().slice(0, 10) : undefined;
  return { startDate, endDate };
};

const getInitialState = () => {
  const userId = getUserId();
  const cacheKey = getCacheKey(userId);
  const cached = safeGetJSON<{ clicks: ClickRow[]; lastUpdated?: number }>(cacheKey);
  if (cached && Array.isArray(cached.clicks)) {
    return {
      clicks: cached.clicks,
      fullClicks: cached.clicks,
      hydrated: true,
      lastUpdated: cached.lastUpdated ?? Date.now(),
    };
  }
  return { clicks: [], fullClicks: [], hydrated: false, lastUpdated: null };
};

export const useClicksStore = create<ClicksState>((set, get) => {
  const initial = getInitialState();
  return {
    clicks: initial.clicks,
    fullClicks: initial.fullClicks,
    loading: false,
    error: null,
    hydrated: initial.hydrated,
    lastUpdated: initial.lastUpdated,

    invalidate: () => {
      const userId = getUserId();
      safeRemove(getCacheKey(userId));
      set({ clicks: [], fullClicks: [], hydrated: false, lastUpdated: null });
    },

    persist: (newClicks: ClickRow[]) => {
      const userId = getUserId();
      const cacheKey = getCacheKey(userId);
      const now = Date.now();
      set({ clicks: newClicks, fullClicks: newClicks, hydrated: true, lastUpdated: now });
      safeSetJSON(cacheKey, { clicks: newClicks, lastUpdated: now });
    },

    fetchClicks: async (opts = {}) => {
      const userId = getUserId();
      const cacheKey = getCacheKey(userId);
      const { fullClicks, hydrated, loading } = get();

      // 1. Se já temos dados na memória e não foi forçado, apenas retorna
      if (hydrated && fullClicks.length > 0 && !opts.force) {
        set({ clicks: fullClicks });
        return fullClicks;
      }

      // 2. Busca da API
      if (loading) return get().clicks;
      set({ loading: true, error: null });
      
      try {
        const apiRows = await fetchClickRows({
          limit: opts.limit,
          offset: opts.offset,
        });

        const now = Date.now();
        // GARANTIA: Seta no estado e NO localStorage IMEDIATAMENTE após o retorno
        set({ 
          clicks: apiRows, 
          fullClicks: apiRows, 
          hydrated: true, 
          lastUpdated: now 
        });

        localStorage.setItem(cacheKey, JSON.stringify({ 
          clicks: apiRows, 
          lastUpdated: now 
        }));

        return apiRows;
      } catch (error: any) {
        set({ error: error?.message || "Erro ao carregar dados de cliques" });
        return get().clicks;
      } finally {
        set({ loading: false });
      }
    },
  };
});
