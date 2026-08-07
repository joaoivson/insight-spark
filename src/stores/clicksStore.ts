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
  // Evita revalidações concorrentes em background (stale-while-revalidate).
  let revalidating = false;
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

      // Busca da API (respeitando o range pedido) e atualiza estado + localStorage.
      // Quando `background=true` NÃO mexe em `loading` (não pisca o skeleton durante a revalidação).
      const fetchFromApi = async (background: boolean): Promise<ClickRow[]> => {
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
            loadedUserId: getUserId(),
          });

          localStorage.setItem(cacheKey, JSON.stringify({
            clicks: apiRows,
            totalClicks: total_clicks,
            lastUpdated: now,
          }));

          return apiRows;
        } catch (error: any) {
          if (!background) set({ error: error?.message || "Erro ao carregar dados de cliques" });
          return get().clicks;
        }
      };

      // Dispara uma revalidação em background (no máx. 1 em voo).
      const revalidateInBackground = () => {
        if (revalidating || get().loading) return;
        revalidating = true;
        void fetchFromApi(true).finally(() => { revalidating = false; });
      };

      // Garantia: Se o usuário logado mudou, recarrega do cache dele ou limpa a memória
      if (userId !== get().loadedUserId) {
        const cached = safeGetJSON<{ clicks: ClickRow[]; totalClicks?: number; lastUpdated?: number }>(cacheKey);
        if (cached && Array.isArray(cached.clicks)) {
          const now = cached.lastUpdated ?? Date.now();
          set({ clicks: cached.clicks, fullClicks: cached.clicks, totalClicks: cached.totalClicks ?? null, hydrated: true, lastUpdated: now, loadedUserId: userId });
          if (!opts.force) {
            revalidateInBackground();
            return cached.clicks;
          }
        } else {
          set({ clicks: [], fullClicks: [], totalClicks: null, hydrated: false, lastUpdated: null, loadedUserId: userId });
        }
      }

      const { fullClicks, hydrated, loading } = get();

      // 1. Cache quente: retorna imediato E revalida em background (stale-while-revalidate).
      //    Mesma causa raiz corrigida no adSpendsStore: sem isso, cliques novos gravados no
      //    servidor nunca chegavam a um device com cache local já populado — divergência de
      //    valores entre celular e PC na mesma conta.
      if (hydrated && fullClicks.length > 0 && !opts.force) {
        set({ clicks: fullClicks });
        revalidateInBackground();
        return fullClicks;
      }

      // 2. Sem cache (ou force): busca bloqueante (com skeleton).
      if (loading) return get().clicks;
      set({ loading: true, error: null });
      try {
        return await fetchFromApi(false);
      } finally {
        set({ loading: false });
      }
    },
  };
});
