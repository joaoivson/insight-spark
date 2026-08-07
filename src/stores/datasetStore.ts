import { create } from "zustand";
import type { DatasetRow } from "@/components/dashboard/DataTable";
import { getScopedKey, getUserId } from "@/shared/lib/storage";
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
  loadedUserId: string | null; // ID do usuário que carregou os dados em memória
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
  const userId = getUserId();
  const cacheKey = getScopedKey(CACHE_KEY_BASE);
  const cached = safeGetJSON<{ rows: DatasetRow[]; lastUpdated?: number }>(cacheKey);
  if (cached && Array.isArray(cached.rows)) {
    return {
      rows: cached.rows,
      fullRows: cached.rows,
      hydrated: true,
      lastUpdated: cached.lastUpdated ?? Date.now(),
      loadedUserId: userId,
    };
  }
  return { rows: [], fullRows: [], hydrated: false, lastUpdated: null, loadedUserId: userId };
};

export const useDatasetStore = create<DatasetState>((set, get) => {
  const initial = getInitialState();
  // Evita revalidações concorrentes em background (stale-while-revalidate).
  let revalidating = false;
  return {
    rows: initial.rows,
    fullRows: initial.fullRows,
    loading: false,
    error: null,
    hydrated: initial.hydrated,
    lastUpdated: initial.lastUpdated,
    loadedUserId: initial.loadedUserId,

    invalidate: () => {
      safeRemove(getScopedKey(CACHE_KEY_BASE));
      set({ rows: [], fullRows: [], hydrated: false, lastUpdated: null, loadedUserId: getUserId() });
    },

    persist: (newRows: DatasetRow[]) => {
      const userId = getUserId();
      const cacheKey = getScopedKey(CACHE_KEY_BASE);
      const now = Date.now();
      set({ rows: newRows, fullRows: newRows, hydrated: true, lastUpdated: now, loadedUserId: userId });
      safeSetJSON(cacheKey, { rows: newRows, lastUpdated: now });
    },

    fetchRows: async (opts = {}) => {
      const userId = getUserId();
      const cacheKey = getScopedKey(CACHE_KEY_BASE);

      // Busca tudo da API e atualiza estado + localStorage. Quando `background=true`
      // NÃO mexe em `loading` (não pisca o skeleton do dashboard durante a revalidação).
      const fetchFromApi = async (background: boolean): Promise<DatasetRow[]> => {
        try {
          const apiRows = await fetchDatasetRows({});

          const now = Date.now();
          // GARANTIA: Seta no estado e NO localStorage IMEDIATAMENTE após o retorno
          set({
            rows: apiRows,
            fullRows: apiRows,
            hydrated: true,
            lastUpdated: now,
            loadedUserId: getUserId(),
          });

          localStorage.setItem(cacheKey, JSON.stringify({
            rows: apiRows,
            lastUpdated: now,
          }));

          return apiRows;
        } catch (error: any) {
          if (!background) set({ error: error?.message || "Erro ao carregar dados" });
          return get().rows;
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
        const cached = safeGetJSON<{ rows: DatasetRow[]; lastUpdated?: number }>(cacheKey);
        if (cached && Array.isArray(cached.rows)) {
          const now = cached.lastUpdated ?? Date.now();
          set({ rows: cached.rows, fullRows: cached.rows, hydrated: true, lastUpdated: now, loadedUserId: userId });
          if (!opts.force) {
            revalidateInBackground();
            return cached.rows;
          }
        } else {
          set({ rows: [], fullRows: [], hydrated: false, lastUpdated: null, loadedUserId: userId });
        }
      }

      const { fullRows, hydrated, loading } = get();

      // 1. Cache quente: retorna imediato E revalida em background (stale-while-revalidate).
      //    Sem isso, dados novos gravados no servidor (sync Shopee/Meta, CSV processado em
      //    outro device, etc.) nunca chegavam a um device com cache local já populado — o
      //    cache localStorage ficava preso indefinidamente, causando divergência de valores
      //    entre celular e PC na mesma conta.
      if (hydrated && fullRows.length > 0 && !opts.force) {
        set({ rows: fullRows });
        revalidateInBackground();
        return fullRows;
      }

      // 2. Sem cache (ou force): busca bloqueante (com skeleton).
      if (loading) return get().rows;
      set({ loading: true, error: null });
      try {
        return await fetchFromApi(false);
      } finally {
        set({ loading: false });
      }
    },
  };
});
