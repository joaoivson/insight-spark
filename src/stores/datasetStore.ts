import { create } from "zustand";
import type { DatasetRow } from "@/components/dashboard/DataTable";
import { getScopedKey } from "@/shared/lib/storage";
import { fetchDatasetRows } from "@/services/datasets.service";
import { safeGetJSON, safeRemove, safeSetJSON } from "@/utils/storage";

type DateRange = { from?: Date | string | null; to?: Date | string | null };

type DatasetState = {
  rows: DatasetRow[]; // The filtered rows currently displayed
  fullRows: DatasetRow[]; // The source of truth (complete dataset)
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  lastUpdated: number | null;
  fetchRows: (opts?: { range?: DateRange; force?: boolean; limit?: number; offset?: number }) => Promise<DatasetRow[]>;
  invalidate: () => void;
  persist: (rows: DatasetRow[]) => void;
};

const CACHE_KEY_BASE = "dataset-cache";

const rangeToParams = (range?: DateRange) => {
  const startDate = range?.from ? new Date(range.from as any).toISOString().slice(0, 10) : undefined;
  const endDate = range?.to ? new Date(range.to as any).toISOString().slice(0, 10) : undefined;
  return { startDate, endDate };
};

const getInitialState = () => {
  const cacheKey = getScopedKey(CACHE_KEY_BASE);
  const cached = safeGetJSON<{ rows: DatasetRow[]; lastUpdated?: number }>(cacheKey);
  if (cached && Array.isArray(cached.rows)) {
    return {
      rows: cached.rows,
      fullRows: cached.rows,
      hydrated: true,
      lastUpdated: cached.lastUpdated ?? Date.now(),
    };
  }
  return { rows: [], fullRows: [], hydrated: false, lastUpdated: null };
};

export const useDatasetStore = create<DatasetState>((set, get) => {
  const initial = getInitialState();
  return {
    rows: initial.rows,
    fullRows: initial.fullRows,
    loading: false,
    error: null,
    hydrated: initial.hydrated,
    lastUpdated: initial.lastUpdated,

    invalidate: () => {
      safeRemove(getScopedKey(CACHE_KEY_BASE));
      set({ rows: [], fullRows: [], hydrated: false, lastUpdated: null });
    },

    persist: (newRows: DatasetRow[]) => {
      const cacheKey = getScopedKey(CACHE_KEY_BASE);
      const now = Date.now();
      set({ rows: newRows, fullRows: newRows, hydrated: true, lastUpdated: now });
      safeSetJSON(cacheKey, { rows: newRows, lastUpdated: now });
    },

    fetchRows: async (opts = {}) => {
      const cacheKey = getScopedKey(CACHE_KEY_BASE);
      const { fullRows, hydrated, loading } = get();

      // 1. Se já temos dados na memória e não foi forçado, apenas retorna
      if (hydrated && fullRows.length > 0 && !opts.force) {
        set({ rows: fullRows });
        return fullRows;
      }

      // 2. Busca da API
      if (loading) return get().rows;
      set({ loading: true, error: null });
      
      try {
        const apiRows = await fetchDatasetRows({});

        const now = Date.now();
        // GARANTIA: Seta no estado e NO localStorage IMEDIATAMENTE após o retorno
        set({ 
          rows: apiRows, 
          fullRows: apiRows, 
          hydrated: true, 
          lastUpdated: now 
        });
        
        localStorage.setItem(cacheKey, JSON.stringify({ 
          rows: apiRows, 
          lastUpdated: now 
        }));

        return apiRows;
      } catch (error: any) {
        set({ error: error?.message || "Erro ao carregar dados" });
        return get().rows;
      } finally {
        set({ loading: false });
      }
    },
  };
});
