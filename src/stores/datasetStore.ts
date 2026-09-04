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
  loadedRangeKey: string | null; // Período que os dados em memória cobrem
  fetchRows: (opts?: { range?: DateRange; force?: boolean; limit?: number; offset?: number }) => Promise<DatasetRow[]>;
  invalidate: () => void;
  persist: (rows: DatasetRow[]) => void;
};

const CACHE_KEY_BASE = "dataset-cache";

// Acima disto o `JSON.stringify` trava a thread e o `setItem` estoura a cota do
// localStorage (5–10 MB por origem, compartilhada com cliques e investimentos).
// A gravação falhava em silêncio justamente na conta grande — a que mais
// precisava de cache: ~470 bytes/linha, então 67 mil linhas são ~30 MB.
const MAX_CACHE_ROWS = 8000;

// Data pelos componentes LOCAIS, não por `toISOString()`: o range vem do picker
// como meia-noite local, e converter para UTC mandava para a API um dia diferente
// do que a usuária escolheu (o filtro do cliente, esse, sempre comparou local).
// Em UTC-3 o efeito não aparece — mas é o mesmo helper para qualquer fuso.
const toDateParam = (value: Date | string) => {
  const d = new Date(value as any);
  if (isNaN(d.getTime())) return undefined;
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
};

const rangeToParams = (range?: DateRange) => ({
  startDate: range?.from ? toDateParam(range.from) : undefined,
  endDate: range?.to ? toDateParam(range.to) : undefined,
});

// O cache é por PERÍODO, não por usuário só: sem isso o cache de "7 dias" era
// devolvido para quem pedia "mês atual" (e vice-versa), e a tela mostrava o
// período errado até a revalidação em background terminar.
const rangeKey = (range?: DateRange) => {
  const { startDate, endDate } = rangeToParams(range);
  return `${startDate ?? "all"}_${endDate ?? "all"}`;
};

const cacheKeyFor = (range?: DateRange) => getScopedKey(`${CACHE_KEY_BASE}:${rangeKey(range)}`);

const readCache = (cacheKey: string) =>
  safeGetJSON<{ rows: DatasetRow[]; lastUpdated?: number }>(cacheKey);

const writeCache = (cacheKey: string, rows: DatasetRow[], lastUpdated: number) => {
  if (rows.length > MAX_CACHE_ROWS) {
    safeRemove(cacheKey);
    return;
  }
  safeSetJSON(cacheKey, { rows, lastUpdated });
};

// Limpa TODAS as fatias de período do usuário (o cache deixou de ser uma chave só).
const clearAllRangeCaches = () => {
  try {
    const prefix = `${CACHE_KEY_BASE}:`;
    const suffix = `:${getUserId() ?? "anon"}`;
    const alvos: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix) && k.endsWith(suffix)) alvos.push(k);
    }
    alvos.forEach(safeRemove);
    // Chave do formato antigo (sem período), de versões anteriores do app.
    safeRemove(getScopedKey(CACHE_KEY_BASE));
  } catch {
    /* localStorage indisponível */
  }
};

export const useDatasetStore = create<DatasetState>((set, get) => {
  // Evita revalidações concorrentes em background (stale-while-revalidate).
  let revalidating = false;
  return {
    rows: [],
    fullRows: [],
    loading: false,
    error: null,
    hydrated: false,
    lastUpdated: null,
    loadedUserId: getUserId(),
    loadedRangeKey: null,

    invalidate: () => {
      clearAllRangeCaches();
      set({
        rows: [],
        fullRows: [],
        hydrated: false,
        lastUpdated: null,
        loadedUserId: getUserId(),
        loadedRangeKey: null,
      });
    },

    persist: (newRows: DatasetRow[]) => {
      const now = Date.now();
      const key = get().loadedRangeKey;
      set({ rows: newRows, fullRows: newRows, hydrated: true, lastUpdated: now, loadedUserId: getUserId() });
      if (key !== null) writeCache(getScopedKey(`${CACHE_KEY_BASE}:${key}`), newRows, now);
    },

    fetchRows: async (opts = {}) => {
      const userId = getUserId();
      const key = rangeKey(opts.range);
      const cacheKey = cacheKeyFor(opts.range);

      // Busca na API **só o período pedido** e atualiza estado + localStorage.
      // Pedir a base inteira e filtrar no cliente era o custo real do dashboard:
      // na conta maior são 67 mil linhas (~30 MB) para exibir as ~3,9 mil dos
      // últimos 7 dias — 2s só de banco, contra 15ms com o filtro de data.
      // Quando `background=true` NÃO mexe em `loading` (não pisca o skeleton).
      const fetchFromApi = async (background: boolean): Promise<DatasetRow[]> => {
        try {
          const { startDate, endDate } = rangeToParams(opts.range);
          const apiRows = await fetchDatasetRows({
            startDate,
            endDate,
            limit: opts.limit,
            offset: opts.offset,
          });

          const now = Date.now();
          set({
            rows: apiRows,
            fullRows: apiRows,
            hydrated: true,
            lastUpdated: now,
            loadedUserId: getUserId(),
            loadedRangeKey: key,
          });
          writeCache(cacheKey, apiRows, now);

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

      const { fullRows, hydrated, loading, loadedUserId, loadedRangeKey } = get();
      const memoriaServe = hydrated && loadedUserId === userId && loadedRangeKey === key;

      // 1. Cache quente em memória: retorna imediato E revalida em background
      //    (stale-while-revalidate). Sem isso, dados novos gravados no servidor
      //    (sync Shopee/Meta, CSV processado em outro device) nunca chegavam a um
      //    device com cache local já populado — o cache ficava preso
      //    indefinidamente, causando divergência de valores entre celular e PC.
      if (memoriaServe && fullRows.length > 0 && !opts.force) {
        set({ rows: fullRows });
        revalidateInBackground();
        return fullRows;
      }

      // 2. Cache do localStorage para ESTE usuário e ESTE período: pinta na hora
      //    e revalida atrás. Leitura síncrona de propósito — é o que evita o
      //    skeleton em quem já abriu a tela hoje.
      if (!opts.force) {
        const cached = readCache(cacheKey);
        if (cached && Array.isArray(cached.rows) && cached.rows.length > 0) {
          const now = cached.lastUpdated ?? Date.now();
          set({
            rows: cached.rows,
            fullRows: cached.rows,
            hydrated: true,
            lastUpdated: now,
            loadedUserId: userId,
            loadedRangeKey: key,
          });
          revalidateInBackground();
          return cached.rows;
        }
      }

      // 3. Sem cache (ou force): busca bloqueante (com skeleton).
      if (loading) return get().rows;
      set({ loading: true, error: null, loadedUserId: userId });
      try {
        return await fetchFromApi(false);
      } finally {
        set({ loading: false });
      }
    },
  };
});
