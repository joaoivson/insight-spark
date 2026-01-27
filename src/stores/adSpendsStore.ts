import { create } from "zustand";
import type { AdSpend } from "@/shared/types/adspend";
import { userStorage, getUserId } from "@/shared/lib/storage";
import { safeGetJSON, safeRemove, safeSetJSON } from "@/utils/storage";
import { createAdSpend, deleteAdSpend, listAdSpends, updateAdSpend, type AdSpendPayload } from "@/services/adspends.service";

type DateRange = { from?: Date | string | null; to?: Date | string | null };

type AdSpendsState = {
  adSpends: AdSpend[];
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

const getCacheKey = (userId?: string | number | null) => {
  if (userId) {
    // Se já estiver no formato user_X, usar como está
    const idStr = String(userId);
    if (idStr.startsWith('user_')) {
      return `adspends-cache:${idStr}`;
    }
    // Caso contrário, adicionar prefixo user_
    return `adspends-cache:user_${idStr}`;
  }
  return `adspends-cache:anon`;
};

const rangeToParams = (range?: DateRange) => {
  const startDate = range?.from ? new Date(range.from as any).toISOString().slice(0, 10) : undefined;
  const endDate = range?.to ? new Date(range.to as any).toISOString().slice(0, 10) : undefined;
  return { startDate, endDate };
};

export const useAdSpendsStore = create<AdSpendsState>((set, get) => ({
  adSpends: [],
  loading: false,
  error: null,
  hydrated: false,
  lastUpdated: null,

  invalidate: () => {
    const userId = getUserId(); // Usar formato user_4
    safeRemove(getCacheKey(userId));
    set({ adSpends: [], hydrated: false, lastUpdated: null });
  },

  fetchAdSpends: async (opts = {}) => {
    const userId = getUserId(); // Usar formato user_4
    const cacheKey = getCacheKey(userId);
    const { adSpends, hydrated, loading } = get();

    if (hydrated && !opts.force) return adSpends;

    if (!hydrated && !opts.force) {
      const cached = safeGetJSON<{ adSpends: AdSpend[]; lastUpdated?: number }>(cacheKey);
      if (cached && Array.isArray(cached.adSpends)) {
        set({ adSpends: cached.adSpends, hydrated: true, lastUpdated: cached.lastUpdated ?? Date.now() });
        return cached.adSpends;
      }
    }

    if (loading) return adSpends;

    set({ loading: true, error: null });
    try {
      const { startDate, endDate } = rangeToParams(opts.range);
      // userId removido - agora vem do token JWT
      const apiData = await listAdSpends({ startDate, endDate });
      const next = apiData.length === 0 && adSpends.length ? adSpends : apiData;
      set({ adSpends: next, hydrated: true, lastUpdated: Date.now() });
      safeSetJSON(cacheKey, { adSpends: next, lastUpdated: Date.now() });
      return next;
    } catch (error: any) {
      set({ error: error?.message || "Erro ao carregar investimentos" });
      return adSpends;
    } finally {
      set({ loading: false });
    }
  },

  create: async (payload) => {
    // userId removido - agora vem do token JWT
    await createAdSpend(payload);
    await get().fetchAdSpends({ force: true });
  },

  update: async (id, payload) => {
    // userId removido - agora vem do token JWT
    await updateAdSpend(id, payload);
    await get().fetchAdSpends({ force: true });
  },

  remove: async (id) => {
    // userId removido - agora vem do token JWT
    await deleteAdSpend(id);
    await get().fetchAdSpends({ force: true });
  },
}));
