import { create } from "zustand";
import { getScopedKey, getUserId } from "@/shared/lib/storage";
import { fetchClickRows, ClickRow } from "@/services/clicks.service";
import { safeGetJSON, safeRemove, safeSetJSON } from "@/utils/storage";

type DateRange = { from?: Date | string | null; to?: Date | string | null };

type ClicksState = {
  clicks: ClickRow[];
  fullClicks: ClickRow[];
  totalClicks: number | null; // total_clicks retornado pela API
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  lastUpdated: number | null;
  loadedUserId: string | null;
  fetchClicks: (opts?: { range?: DateRange; force?: boolean; limit?: number; offset?: number }) => Promise<ClickRow[]>;
  invalidate: () => void;
  persist: (clicks: ClickRow[]) => void;
};

const CACHE_KEY_BASE = "clicks-cache";

const rangeToParams = (range?: DateRange) => {
  const startDate = range?.from ? new Date(range.from as any).toISOString().slice(0, 10) : undefined;
  const endDate = range?.to ? new Date(range.to as any).toISOString().slice(0, 10) : undefined;
  return { startDate, endDate };
};

const getInitialState = () => {
  const userId = getUserId();
  const cacheKey = getScopedKey(CACHE_KEY_BASE);
  const cached = safeGetJSON<{ clicks: ClickRow[]; totalClicks?: number; lastUpdated?: number }>(cacheKey);
  if (cached && Array.isArray(cached.clicks)) {
    return {
      clicks: cached.clicks,
      fullClicks: cached.clicks,
      totalClicks: cached.totalClicks ?? null,
      hydrated: true,
      lastUpdated: cached.lastUpdated ?? Date.now(),
      loadedUserId: userId,
    };
  }
  return { clicks: [], fullClicks: [], totalClicks: null, hydrated: false, lastUpdated: null, loadedUserId: userId };
};

export const useClicksStore = create<ClicksState>((set, get) => {
  const initial = getInitialState();
  return {
    clicks: initial.clicks,
    fullClicks: initial.fullClicks,
    totalClicks: initial.totalClicks ?? null,
    loading: false,
    error: null,
    hydrated: initial.hydrated,
    lastUpdated: initial.lastUpdated,
    loadedUserId: initial.loadedUserId,

    invalidate: () => {
      safeRemove(getScopedKey(CACHE_KEY_BASE));
      set({ clicks: [], fullClicks: [], totalClicks: null, hydrated: false, lastUpdated: null, loadedUserId: getUserId() });
    },

    persist: (newClicks: ClickRow[]) => {
      const userId = getUserId();
      const cacheKey = getScopedKey(CACHE_KEY_BASE);
      const now = Date.now();
      set({ clicks: newClicks, fullClicks: newClicks, totalClicks: null, hydrated: true, lastUpdated: now, loadedUserId: userId });
      safeSetJSON(cacheKey, { clicks: newClicks, lastUpdated: now });
    },

    fetchClicks: async (opts = {}) => {
      const userId = getUserId();
      const cacheKey = getScopedKey(CACHE_KEY_BASE);
      const { fullClicks, hydrated, loading, loadedUserId } = get();

      // Garantia: Se o usuário logado mudou, recarrega do cache dele ou limpa a memória
      if (userId !== loadedUserId) {
        const cached = safeGetJSON<{ clicks: ClickRow[]; totalClicks?: number; lastUpdated?: number }>(cacheKey);
        if (cached && Array.isArray(cached.clicks)) {
          const now = cached.lastUpdated ?? Date.now();
          set({ clicks: cached.clicks, fullClicks: cached.clicks, totalClicks: cached.totalClicks ?? null, hydrated: true, lastUpdated: now, loadedUserId: userId });
          if (!opts.force) return cached.clicks;
        } else {
          set({ clicks: [], fullClicks: [], totalClicks: null, hydrated: false, lastUpdated: null, loadedUserId: userId });
        }
      }

      // 1. Se já temos dados na memória e não foi forçado, apenas retorna
      if (hydrated && fullClicks.length > 0 && !opts.force) {
        set({ clicks: fullClicks });
        return fullClicks;
      }

      // 2. Busca da API
      if (loading) return get().clicks;
      set({ loading: true, error: null });
      
      try {
        const { startDate, endDate } = rangeToParams(opts.range);
        const { rows: apiRows, total_clicks } = await fetchClickRows({
          startDate,
          endDate,
          limit: opts.limit,
          offset: opts.offset,
        });

        const now = Date.now();
        set({ 
          clicks: apiRows, 
          fullClicks: apiRows, 
          totalClicks: total_clicks,
          hydrated: true, 
          lastUpdated: now,
          loadedUserId: userId
        });

        localStorage.setItem(cacheKey, JSON.stringify({ 
          clicks: apiRows, 
          totalClicks: total_clicks,
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
