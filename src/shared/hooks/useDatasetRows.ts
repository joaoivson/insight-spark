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
let inflight: Promise<{ rows: DatasetRow[]; adSpends: AdSpend[] }> | null = null;

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
  inflight = null;
};

type DateRangeParam = { from?: Date | string | null; to?: Date | string | null };

const buildRangeQuery = (range?: DateRangeParam) => {
  if (!range?.from && !range?.to) return "";
  const params = new URLSearchParams();
  if (range?.from) params.set("start_date", new Date(range.from).toISOString().slice(0, 10));
  if (range?.to) params.set("end_date", new Date(range.to).toISOString().slice(0, 10));
  return `&${params.toString()}`;
};

const getDefaultRange = (): DateRangeParam => {
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - 29);
  return { from, to: today };
};

const ensureRange = (range?: DateRangeParam): DateRangeParam => {
  const withDefault = range && range.from && range.to ? range : getDefaultRange();
  return withDefault;
};

const fetchDatasetRows = async (range?: DateRangeParam): Promise<DatasetRow[]> => {
  const storedUser = (userStorage.get() as { id?: string } | null) || null;
  const userIdParam = storedUser?.id ? `?user_id=${storedUser.id}` : "?";
  const effectiveRange = ensureRange(range);
  const rangeParam = buildRangeQuery(effectiveRange);

  const res = await fetch(getApiUrl(`/api/datasets/all/rows${userIdParam}${rangeParam}`));
  const data = await res.json();
  if (!res.ok || !Array.isArray(data)) {
    return [];
  }
  return data.map(parseDatasetRow);
};

const fetchAdSpends = async (range?: DateRangeParam): Promise<AdSpend[]> => {
  const storedUser = (userStorage.get() as { id?: string } | null) || null;
  const userIdParam = storedUser?.id ? `?user_id=${storedUser.id}` : "?";
  const effectiveRange = ensureRange(range);
  const rangeParam = buildRangeQuery(effectiveRange);

  const res = await fetch(getApiUrl(`/api/ad_spends${userIdParam}${rangeParam}`));
  const data = await res.json();
  if (!res.ok || !Array.isArray(data)) {
    return [];
  }
  return data;
};

export const useDatasetRows = () => {
  const [rows, setRows] = useState<DatasetRow[]>(cachedRows ?? []);
  const [adSpends, setAdSpends] = useState<AdSpend[]>(cachedAdSpends ?? []);
  const [loading, setLoading] = useState(!cachedRows);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRangeParam | undefined>(undefined);

  const load = useCallback(
    async (force?: boolean, nextRange?: DateRangeParam) => {
      try {
        setLoading(true);
        setError(null);
        const effectiveRange = ensureRange(nextRange ?? range);
        
        if (!force && cachedRows && cachedAdSpends) {
          setRows(cachedRows);
          setAdSpends(cachedAdSpends);
          setLoading(false);
          return { rows: cachedRows, adSpends: cachedAdSpends };
        }
        
        if (!force && inflight) {
          const data = await inflight;
          setRows(data.rows);
          setAdSpends(data.adSpends);
          setLoading(false);
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
    []
  );

  useEffect(() => {
    if (!cachedRows) {
      load();
    }
  }, [load]);

  return {
    rows,
    adSpends,
    loading,
    error,
    refresh: (nextRange?: DateRangeParam) => load(true, nextRange),
    currentRange: range,
  };
};
