import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "@/core/config/api.config";
import { userStorage } from "@/shared/lib/storage";
import type { DatasetRow } from "@/components/dashboard/DataTable";

export interface AdSpend {
  id: number;
  date: string;
  amount: number;
  sub_id: string | null;
}

let cachedRows: DatasetRow[] | null = null;
let cachedAdSpends: AdSpend[] | null = null;
let cachedAt: number | null = null;
let inflight: Promise<{ rows: DatasetRow[]; adSpends: AdSpend[] }> | null = null;
let currentDatasetAbort: AbortController | null = null;
let currentAdSpendAbort: AbortController | null = null;

const getCacheKey = (userId?: string | null) => `dataset-cache:${userId || "anon"}`;

const loadCache = (userId?: string | null) => {
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.rows || !parsed.adSpends) return null;
    return parsed as { rows: DatasetRow[]; adSpends: AdSpend[]; cachedAt?: number };
  } catch {
    return null;
  }
};

const saveCache = (userId: string | null | undefined, rows: DatasetRow[], adSpends: AdSpend[]) => {
  try {
    localStorage.setItem(
      getCacheKey(userId),
      JSON.stringify({ rows, adSpends, cachedAt: Date.now() })
    );
  } catch {
    // ignore quota errors
  }
};

const clearCache = (userId?: string | null) => {
  try {
    localStorage.removeItem(getCacheKey(userId));
  } catch {
    // ignore
  }
};

const cleanNumber = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    let cleaned = value.replace(/R\$/gi, "").replace(/\s+/g, "");
    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");

    if (hasComma && hasDot) {
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    } else if (hasComma) {
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    } else {
      cleaned = cleaned;
    }

    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeMonetaryFields = (raw: Record<string, any>) => {
  const normalized: Record<string, any> = { ...raw };
  Object.keys(raw || {}).forEach((key) => {
    const keyLower = key.toLowerCase();
    const isValor = keyLower.startsWith("valor");
    const isComissao = keyLower.startsWith("comiss");
    if (isValor || isComissao) {
      const parsed = cleanNumber(raw[key]);
      if (parsed !== null) {
        normalized[key] = parsed;
      }
    }
  });
  return normalized;
};

const parseDatasetRow = (r: any): DatasetRow => {
  const raw = normalizeMonetaryFields(r?.raw_data || {});

  const horarioPedido = raw["Horário do pedido"] || raw["Horario do pedido"];
  let parsedDate: string | null = r.date || null;
  let parsedTime: string | null = r.time || null;
  let parsedMesAno: string | null = r.mes_ano || null;
  if (horarioPedido && typeof horarioPedido === "string") {
    const [datePart, timePart] = horarioPedido.split(" ");
    if (datePart) {
      parsedDate = datePart;
      parsedMesAno = datePart.slice(0, 7);
    }
    if (timePart) parsedTime = timePart;
  }

  const revenue =
    cleanNumber(raw["Preço(R$)"]) ??
    cleanNumber(raw["Valor de Compra(R$)"]) ??
    cleanNumber(r.revenue) ??
    0;

  const commission =
    cleanNumber(raw["Comissão do Item da Shopee(R$)"]) ??
    cleanNumber(raw["Comissão Shopee(R$)"]) ??
    cleanNumber(raw["Comissão total do pedido(R$)"]) ??
    cleanNumber(raw["Comissão total do item(R$)"]) ??
    cleanNumber(raw["Comissão líquida do afiliado(R$)"]) ??
    cleanNumber(r.commission) ??
    0;

  const profit = revenue - commission;

  const product =
    r.product ??
    r.product_name ??
    raw["Nome do Item"] ??
    "Produto";

  const product_name = r.product_name ?? raw["Nome do Item"] ?? null;

  return {
    id: r.id,
    date: parsedDate || r.date,
    time: parsedTime,
    mes_ano: parsedMesAno ?? null,
    product,
    product_name,
    platform: r.platform ?? raw.Canal ?? null,
    revenue: revenue ?? 0,
    cost: 0,
    commission: commission ?? 0,
    profit: profit ?? 0,
    status: r.status ?? raw["Status do Pedido"] ?? null,
    category:
      r.category ??
      raw["Categoria Global L1"] ??
      null,
    sub_id1: r.sub_id1 ?? raw.Sub_id1 ?? raw.sub_id1 ?? null,
    gross_value: cleanNumber(raw.gross_value),
    commission_value: undefined,
    net_value: profit ?? 0,
    quantity: cleanNumber(r.quantity) ?? cleanNumber(raw.Qtd),
    raw_data: r.raw_data ?? null,
  };
};

export const invalidateDatasetRowsCache = () => {
  cachedRows = null;
  cachedAdSpends = null;
  cachedAt = null;
  inflight = null;
  const storedUser = (userStorage.get() as { id?: string } | null) || null;
  clearCache(storedUser?.id ?? null);
};

type DateRangeParam = { from?: Date | string | null; to?: Date | string | null };

const buildRangeQuery = (range?: DateRangeParam) => {
  const params = new URLSearchParams();
  if (range?.from) params.set("start_date", new Date(range.from).toISOString().slice(0, 10));
  if (range?.to) params.set("end_date", new Date(range.to).toISOString().slice(0, 10));
  return params;
};

const ensureRange = (range?: DateRangeParam): DateRangeParam => {
  if (range) return range;
  return {};
};

const fetchDatasetRows = async (range?: DateRangeParam): Promise<DatasetRow[]> => {
  const storedUser = (userStorage.get() as { id?: string } | null) || null;
  const effectiveRange = ensureRange(range);
  const params = buildRangeQuery(effectiveRange);
  params.set("include_raw_data", "true");
  if (storedUser?.id) params.set("user_id", String(storedUser.id));

  currentDatasetAbort?.abort();
  currentDatasetAbort = new AbortController();

  const res = await fetch(getApiUrl(`/api/datasets/all/rows?${params.toString()}`), {
    signal: currentDatasetAbort.signal,
  });
  const data = await res.json();
  if (!res.ok || !Array.isArray(data)) {
    return [];
  }
  return data.map(parseDatasetRow);
};

const fetchAdSpends = async (range?: DateRangeParam): Promise<AdSpend[]> => {
  const storedUser = (userStorage.get() as { id?: string } | null) || null;
  const effectiveRange = ensureRange(range);
  const params = buildRangeQuery(effectiveRange);
  if (storedUser?.id) params.set("user_id", String(storedUser.id));

  currentAdSpendAbort?.abort();
  currentAdSpendAbort = new AbortController();

  const res = await fetch(getApiUrl(`/api/ad_spends?${params.toString()}`), {
    signal: currentAdSpendAbort.signal,
  });
  const data = await res.json();
  if (!res.ok || !Array.isArray(data)) {
    return [];
  }
  return data;
};

export const useDatasetRows = () => {
  const storedUser = (userStorage.get() as { id?: string } | null) || null;

  // Boot from localStorage if nothing in memory
  if (!cachedRows || !cachedAdSpends) {
    const local = loadCache(storedUser?.id ?? null);
    if (local && local.rows && local.adSpends) {
      cachedRows = local.rows;
      cachedAdSpends = local.adSpends;
      cachedAt = local.cachedAt ?? Date.now();
    }
  }

  const [rows, setRows] = useState<DatasetRow[]>(cachedRows ?? []);
  const [adSpends, setAdSpends] = useState<AdSpend[]>(cachedAdSpends ?? []);
  const [loading, setLoading] = useState(cachedRows === null || cachedAdSpends === null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRangeParam | undefined>(undefined);

  const load = useCallback(
    async (force?: boolean, nextRange?: DateRangeParam) => {
      try {
        setLoading(true);
        setError(null);
        const effectiveRange = ensureRange(nextRange ?? range);
        
        // 1) tenta cache em memória
        if (!force && cachedRows && cachedAdSpends) {
          setRows(cachedRows);
          setAdSpends(cachedAdSpends);
          setLoading(false);
          // garante persistência no localStorage
          const exists = loadCache(storedUser?.id ?? null);
          if (!exists) saveCache(storedUser?.id ?? null, cachedRows, cachedAdSpends);
          return { rows: cachedRows, adSpends: cachedAdSpends };
        }

        // 2) tenta cache localStorage
        if (!force && (!cachedRows || !cachedAdSpends)) {
          const local = loadCache(storedUser?.id ?? null);
          if (local && local.rows && local.adSpends) {
            cachedRows = local.rows;
            cachedAdSpends = local.adSpends;
            cachedAt = local.cachedAt ?? Date.now();
            setRows(cachedRows);
            setAdSpends(cachedAdSpends);
            setLoading(false);
            return { rows: cachedRows, adSpends: cachedAdSpends };
          }
        }
        
        if (!force && inflight) {
          const data = await inflight;
          setRows(data.rows);
          setAdSpends(data.adSpends);
          setLoading(false);
          cachedRows = data.rows;
          cachedAdSpends = data.adSpends;
          cachedAt = Date.now();
          saveCache(storedUser?.id ?? null, data.rows, data.adSpends);
          return data;
        }

        const promise = Promise.all([
          fetchDatasetRows(effectiveRange),
          fetchAdSpends(effectiveRange)
        ]).then(([newRows, newAdSpends]) => ({ rows: newRows, adSpends: newAdSpends }));
        
        inflight = promise;
        const data = await promise;
        
        cachedRows = data.rows;
        cachedAdSpends = data.adSpends;
        cachedAt = Date.now();
        saveCache(storedUser?.id ?? null, data.rows, data.adSpends);
        
        setRows(data.rows);
        setAdSpends(data.adSpends);
        
        if (nextRange !== undefined) setRange(effectiveRange);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
        setRows([]);
        setAdSpends([]);
        return { rows: [], adSpends: [] };
      } finally {
        setLoading(false);
        inflight = null;
      }
    },
    [storedUser]
  );

  useEffect(() => {
    if (cachedRows === null || cachedAdSpends === null) {
      load();
    } else {
      // Se já temos cache em memória, garanta que o localStorage também tenha
      const exists = loadCache(storedUser?.id ?? null);
      if (!exists) {
        saveCache(storedUser?.id ?? null, cachedRows, cachedAdSpends);
      }
    }
  }, [load]);

  // Persist every time rows/adSpends mudam após carregamento
  useEffect(() => {
    if (!loading && rows && adSpends) {
      saveCache(storedUser?.id ?? null, rows, adSpends);
    }
  }, [loading, rows, adSpends, storedUser]);

  return {
    rows,
    adSpends,
    loading,
    error,
    refresh: (nextRange?: DateRangeParam) => load(true, nextRange),
    currentRange: range,
  };
};
