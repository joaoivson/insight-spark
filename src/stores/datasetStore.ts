import { create } from "zustand";
import type { DatasetRow } from "@/components/dashboard/DataTable";
import { userStorage, getUserId } from "@/shared/lib/storage";
import { fetchDatasetRows } from "@/services/datasets.service";
import { safeGetJSON, safeRemove, safeSetJSON } from "@/utils/storage";

type DateRange = { from?: Date | string | null; to?: Date | string | null };

type DatasetState = {
  rows: DatasetRow[];
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  lastUpdated: number | null;
  fetchRows: (opts?: { range?: DateRange; force?: boolean; includeRawData?: boolean; limit?: number; offset?: number }) => Promise<DatasetRow[]>;
  invalidate: () => void;
  persist: (rows: DatasetRow[]) => void;
};

const getCacheKey = (userId?: string | number | null) => {
  if (userId) {
    // Se já estiver no formato user_X, usar como está
    const idStr = String(userId);
    if (idStr.startsWith('user_')) {
      return `dataset-cache:${idStr}`;
    }
    // Caso contrário, adicionar prefixo user_
    return `dataset-cache:user_${idStr}`;
  }
  return `dataset-cache:anon`;
};

const rangeToParams = (range?: DateRange) => {
  const startDate = range?.from ? new Date(range.from as any).toISOString().slice(0, 10) : undefined;
  const endDate = range?.to ? new Date(range.to as any).toISOString().slice(0, 10) : undefined;
  return { startDate, endDate };
};

const getInitialState = () => {
  const userId = getUserId(); // Usar formato user_4
  const cacheKey = getCacheKey(userId);
  const cached = safeGetJSON<{ rows: DatasetRow[]; lastUpdated?: number }>(cacheKey);
  if (cached && Array.isArray(cached.rows)) {
    return {
      rows: cached.rows,
      hydrated: true,
      lastUpdated: cached.lastUpdated ?? Date.now(),
    };
  }
  return { rows: [], hydrated: false, lastUpdated: null };
};

export const useDatasetStore = create<DatasetState>((set, get) => {
  const initial = getInitialState();
  return {
    rows: initial.rows,
    loading: false,
    error: null,
    hydrated: initial.hydrated,
    lastUpdated: initial.lastUpdated,

  invalidate: () => {
    const userId = getUserId(); // Usar formato user_4
    safeRemove(getCacheKey(userId));
    set({ rows: [], hydrated: false, lastUpdated: null });
  },

  persist: (newRows: DatasetRow[]) => {
    const userId = getUserId(); // Usar formato user_4
    const cacheKey = getCacheKey(userId);
    const now = Date.now();
    set({ rows: newRows, hydrated: true, lastUpdated: now });
    safeSetJSON(cacheKey, { rows: newRows, lastUpdated: now });
  },

  fetchRows: async (opts = {}) => {
    const userId = getUserId(); // Usar formato user_4
    const cacheKey = getCacheKey(userId);
    const { rows, hydrated, loading } = get();

    // If already hydrated and not forced, return current rows (mesmo que vazio)
    if (hydrated && !opts.force) return rows;

    // Hydrate from cache on first access
    if (!hydrated && !opts.force) {
      const cached = safeGetJSON<{ rows: DatasetRow[]; lastUpdated?: number }>(cacheKey);
      if (cached && Array.isArray(cached.rows)) {
        set({ rows: cached.rows, hydrated: true, lastUpdated: cached.lastUpdated ?? Date.now() });
        // Sempre devolve o cache, mesmo vazio, para evitar chamada extra
        return cached.rows;
      }
    }

    // Avoid parallel identical calls
    if (loading) return rows;

    set({ loading: true, error: null });
    try {
      const { startDate, endDate } = rangeToParams(opts.range);
      // userId removido - agora vem do token JWT
      const apiRows = await fetchDatasetRows({
        startDate,
        endDate,
        includeRawData: opts.includeRawData,
        limit: opts.limit,
        offset: opts.offset,
      });

      // Preserve existing data if API returns empty but we already have cached rows
      const nextRows = apiRows.length === 0 && rows.length ? rows : apiRows;
      const now = Date.now();
      set({ rows: nextRows, hydrated: true, lastUpdated: now });
      safeSetJSON(cacheKey, { rows: nextRows, lastUpdated: now });
      return nextRows;
    } catch (error: any) {
      set({ error: error?.message || "Erro ao carregar dados" });
      return rows;
    } finally {
      set({ loading: false });
    }
  },
  };
});
