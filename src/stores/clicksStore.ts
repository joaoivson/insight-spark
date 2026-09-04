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
  loadedRangeKey: string | null; // Período que os cliques em memória cobrem
  fetchClicks: (opts?: { range?: DateRange; force?: boolean; limit?: number; offset?: number }) => Promise<ClickRow[]>;
  invalidate: () => void;
  persist: (clicks: ClickRow[]) => void;
};

const CACHE_KEY_BASE = "clicks-cache";

// Mesmo teto do datasetStore: acima disso o stringify trava a thread e o
// setItem estoura a cota do localStorage, falhando em silêncio.
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

// A busca já respeitava o período; o CACHE não. Uma chave só por usuário fazia o
// cache de "7 dias" ser devolvido para quem pedia "mês atual", e a tela mostrava
// o período errado até a revalidação em background terminar.
const rangeKey = (range?: DateRange) => {
  const { startDate, endDate } = rangeToParams(range);
  return `${startDate ?? "all"}_${endDate ?? "all"}`;
};

const cacheKeyFor = (range?: DateRange) => getScopedKey(`${CACHE_KEY_BASE}:${rangeKey(range)}`);

type CacheShape = { clicks: ClickRow[]; totalClicks?: number; lastUpdated?: number };

const writeCache = (cacheKey: string, clicks: ClickRow[], totalClicks: number | null, lastUpdated: number) => {
  if (clicks.length > MAX_CACHE_ROWS) {
    safeRemove(cacheKey);
    return;
  }
  safeSetJSON(cacheKey, { clicks, totalClicks, lastUpdated });
};

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

export const useClicksStore = create<ClicksState>((set, get) => {
  // Evita revalidações concorrentes em background (stale-while-revalidate).
  let revalidating = false;
  return {
    clicks: [],
    fullClicks: [],
    totalClicks: null,
    loading: false,
    error: null,
    hydrated: false,
    lastUpdated: null,
    loadedUserId: getUserId(),
    loadedRangeKey: null,

    invalidate: () => {
      clearAllRangeCaches();
      set({
        clicks: [],
        fullClicks: [],
        totalClicks: null,
        hydrated: false,
        lastUpdated: null,
        loadedUserId: getUserId(),
        loadedRangeKey: null,
      });
    },

    persist: (newClicks: ClickRow[]) => {
      const now = Date.now();
      const key = get().loadedRangeKey;
      set({ clicks: newClicks, fullClicks: newClicks, totalClicks: null, hydrated: true, lastUpdated: now, loadedUserId: getUserId() });
      if (key !== null) writeCache(getScopedKey(`${CACHE_KEY_BASE}:${key}`), newClicks, null, now);
    },

    fetchClicks: async (opts = {}) => {
      const userId = getUserId();
      const key = rangeKey(opts.range);
      const cacheKey = cacheKeyFor(opts.range);

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
            loadedRangeKey: key,
          });
          writeCache(cacheKey, apiRows, total_clicks, now);

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

      const { fullClicks, hydrated, loading, loadedUserId, loadedRangeKey } = get();
      const memoriaServe = hydrated && loadedUserId === userId && loadedRangeKey === key;

      // 1. Cache quente em memória: retorna imediato E revalida em background.
      //    Mesma causa raiz corrigida no adSpendsStore: sem isso, cliques novos
      //    gravados no servidor nunca chegavam a um device com cache local já
      //    populado — divergência de valores entre celular e PC na mesma conta.
      if (memoriaServe && fullClicks.length > 0 && !opts.force) {
        set({ clicks: fullClicks });
        revalidateInBackground();
        return fullClicks;
      }

      // 2. Cache do localStorage para ESTE usuário e ESTE período.
      if (!opts.force) {
        const cached = safeGetJSON<CacheShape>(cacheKey);
        if (cached && Array.isArray(cached.clicks) && cached.clicks.length > 0) {
          const now = cached.lastUpdated ?? Date.now();
          set({
            clicks: cached.clicks,
            fullClicks: cached.clicks,
            totalClicks: cached.totalClicks ?? null,
            hydrated: true,
            lastUpdated: now,
            loadedUserId: userId,
            loadedRangeKey: key,
          });
          revalidateInBackground();
          return cached.clicks;
        }
      }

      // 3. Sem cache (ou force): busca bloqueante (com skeleton).
      if (loading) return get().clicks;
      set({ loading: true, error: null, loadedUserId: userId });
      try {
        return await fetchFromApi(false);
      } finally {
        set({ loading: false });
      }
    },
  };
});
