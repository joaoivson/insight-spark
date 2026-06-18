import { create } from "zustand";
import type { AdSpend } from "@/shared/types/adspend";
import { getScopedKey, getUserId } from "@/shared/lib/storage";
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
  loadedUserId: string | null; // ID do usuário que carregou os dados em memória
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
  const userId = getUserId();
  const cacheKey = getScopedKey(CACHE_KEY_BASE);
  const cached = safeGetJSON<{ adSpends: AdSpend[]; lastUpdated?: number }>(cacheKey);
  if (cached && Array.isArray(cached.adSpends)) {
    return {
      adSpends: cached.adSpends,
      fullAdSpends: cached.adSpends,
      hydrated: true,
      lastUpdated: cached.lastUpdated ?? Date.now(),
      loadedUserId: userId,
    };
  }
  return { adSpends: [], fullAdSpends: [], hydrated: false, lastUpdated: null, loadedUserId: userId };
};

export const useAdSpendsStore = create<AdSpendsState>((set, get) => {
  const initial = getInitialState();
  // Evita revalidações concorrentes em background (stale-while-revalidate).
  let revalidating = false;
  return {
    adSpends: initial.adSpends,
    fullAdSpends: initial.fullAdSpends,
    loading: false,
    error: null,
    hydrated: initial.hydrated,
    lastUpdated: initial.lastUpdated,
    loadedUserId: initial.loadedUserId,

    invalidate: () => {
      safeRemove(getScopedKey(CACHE_KEY_BASE));
      set({ adSpends: [], fullAdSpends: [], hydrated: false, lastUpdated: null, loadedUserId: getUserId() });
    },

    fetchAdSpends: async (opts = {}) => {
      const userId = getUserId();
      const cacheKey = getScopedKey(CACHE_KEY_BASE);

      // Busca tudo da API e atualiza estado + localStorage. Quando `background=true`
      // NÃO mexe em `loading` (não pisca o skeleton do dashboard durante a revalidação).
      const fetchFromApi = async (background: boolean): Promise<AdSpend[]> => {
        try {
          // ALWAYS fetch all ad spends for the cache
          const apiData = await listAdSpends();
          const now = Date.now();
          set({ adSpends: apiData, fullAdSpends: apiData, hydrated: true, lastUpdated: now, loadedUserId: getUserId() });
          localStorage.setItem(cacheKey, JSON.stringify({ adSpends: apiData, lastUpdated: now }));
          return apiData;
        } catch (error: any) {
          if (!background) set({ error: error?.message || "Erro ao carregar investimentos" });
          return get().adSpends;
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
        const cached = safeGetJSON<{ adSpends: AdSpend[]; lastUpdated?: number }>(cacheKey);
        if (cached && Array.isArray(cached.adSpends)) {
          const now = cached.lastUpdated ?? Date.now();
          set({ adSpends: cached.adSpends, fullAdSpends: cached.adSpends, hydrated: true, lastUpdated: now, loadedUserId: userId });
          if (!opts.force) {
            revalidateInBackground();
            return cached.adSpends;
          }
        } else {
          set({ adSpends: [], fullAdSpends: [], hydrated: false, lastUpdated: null, loadedUserId: userId });
        }
      }

      const { fullAdSpends, hydrated, loading } = get();

      // 1. Cache quente: retorna imediato E revalida em background (stale-while-revalidate).
      //    Sem isso, o gasto espelhado do Meta (gravado pelo cron NO SERVIDOR, que não
      //    invalida o cache do front) NUNCA chegava ao dashboard — o cache localStorage
      //    ficava preso até um create/update/delete manual de investimento.
      if (hydrated && fullAdSpends.length > 0 && !opts.force) {
        set({ adSpends: fullAdSpends });
        revalidateInBackground();
        return fullAdSpends;
      }

      // 2. Sem cache (ou force): busca bloqueante (com skeleton).
      if (loading) return get().adSpends;
      set({ loading: true, error: null });
      try {
        return await fetchFromApi(false);
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
