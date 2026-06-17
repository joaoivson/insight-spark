import type { DatasetRow } from "@/components/dashboard/DataTable";
import type { AdSpend } from "@/shared/types/adspend";
import { parseDateOnly, toDateKey, isBeforeDateKey, isAfterDateKey } from "@/shared/lib/date";
import { filterKpiRows, getComissaoAfiliado, calcTotals } from "@/shared/lib/kpi";
import { normalizeSubId } from "@/shared/lib/utils";
import { grossUpSpend, netCommission, ZERO_TAX, type TaxRates } from "@/shared/lib/tax";

type DateRange = { from?: Date; to?: Date } | undefined;

function filterRowsByDateRange<T extends { date: string }>(rows: T[], dateRange: DateRange): T[] {
  if (!dateRange?.from && !dateRange?.to) return rows;
  return rows.filter((r) => {
    const key = r.date;
    if (dateRange.from && isBeforeDateKey(key, dateRange.from)) return false;
    if (dateRange.to && isAfterDateKey(key, dateRange.to)) return false;
    return true;
  });
}

function getMesAnoFromRow(row: DatasetRow): string {
  if (row.mes_ano && /^\d{4}-\d{2}$/.test(row.mes_ano)) return row.mes_ano;
  const d = parseDateOnly(row.date);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Format number as K (thousands) for chart labels */
export function formatK(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} Mil`;
  return value.toLocaleString("pt-BR");
}

/** Format number as BRL currency */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

/** Group rows by month (mes_ano), sum commission. Usa mesma fonte que kpi.ts (Pend. + Concl.). */
export function groupByMesAno(rows: DatasetRow[], dateRange: DateRange, tax: TaxRates = ZERO_TAX): { label: string; value: number; key: string }[] {
  const filtered = filterKpiRows(filterRowsByDateRange(rows, dateRange));
  const byMonth = new Map<string, number>();
  filtered.forEach((r) => {
    const mesAno = getMesAnoFromRow(r);
    if (!mesAno) return;
    byMonth.set(mesAno, (byMonth.get(mesAno) ?? 0) + getComissaoAfiliado(r));
  });
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const [y, m] = key.split("-");
      const label = y && m ? `${m}/${y}` : key;
      return { label, value: Math.round(netCommission(value, tax) * 100) / 100, key };
    });
}

/** Group rows by day, sum commission. Usa mesma fonte que kpi.ts (Pend. + Concl.). */
export function groupCommissionByDay(rows: DatasetRow[], dateRange: DateRange, tax: TaxRates = ZERO_TAX): { label: string; value: number; key: string }[] {
  const filtered = filterKpiRows(filterRowsByDateRange(rows, dateRange));
  const byDay = new Map<string, number>();
  filtered.forEach((r) => {
    const key = toDateKey(r.date);
    if (!key) return;
    byDay.set(key, (byDay.get(key) ?? 0) + getComissaoAfiliado(r));
  });
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const d = parseDateOnly(key);
      const label = d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : key;
      return { label, value: Math.round(netCommission(value, tax) * 100) / 100, key };
    });
}

/** Group by month: commission from rows, cost from adSpends. Usa mesma fonte que kpi.ts (Pend. + Concl.). */
export function groupRevenueProfitByMes(
  rows: DatasetRow[],
  adSpends: AdSpend[],
  dateRange: DateRange,
  subIdFilter?: string,
  tax: TaxRates = ZERO_TAX
): { mes_ano: string; commission: number; cost: number; profit: number }[] {
  const filteredRows = filterKpiRows(filterRowsByDateRange(rows, dateRange));
  const byMonth = new Map<string, number>();
  filteredRows.forEach((r) => {
    const mesAno = getMesAnoFromRow(r);
    if (!mesAno) return;
    byMonth.set(mesAno, (byMonth.get(mesAno) ?? 0) + getComissaoAfiliado(r));
  });

  const costByMonth = new Map<string, number>();
  adSpends.forEach((s) => {
    if (subIdFilter && normalizeSubId(s.sub_id).toLowerCase() !== subIdFilter.toLowerCase()) return;
    const key = toDateKey(s.date);
    if (!key) return;
    const mesAno = key.slice(0, 7);
    if (dateRange?.from && mesAno < toDateKey(dateRange.from).slice(0, 7)) return;
    if (dateRange?.to && mesAno > toDateKey(dateRange.to).slice(0, 7)) return;
    costByMonth.set(mesAno, (costByMonth.get(mesAno) ?? 0) + (s.amount ?? 0));
  });

  const months = new Set([...byMonth.keys(), ...costByMonth.keys()]);
  return Array.from(months)
    .sort()
    .map((mes_ano) => {
      // comissão líquida (− imposto) × gasto com markup (+ imposto)
      const commission = Math.round(netCommission(byMonth.get(mes_ano) ?? 0, tax) * 100) / 100;
      const cost = Math.round(grossUpSpend(costByMonth.get(mes_ano) ?? 0, tax) * 100) / 100;
      const profit = Math.round((commission - cost) * 100) / 100;
      return { mes_ano, commission, cost, profit };
    });
}

/** Group by channel (platform), sum commission. Usa mesma fonte que kpi.ts (Pend. + Concl.). */
export function groupByPlatform(rows: DatasetRow[], dateRange: DateRange, tax: TaxRates = ZERO_TAX): { name: string; value: number }[] {
  const filtered = filterKpiRows(filterRowsByDateRange(rows, dateRange));
  const byPlatform = new Map<string, number>();
  filtered.forEach((r) => {
    const name = (r.platform?.trim() || "Outros");
    byPlatform.set(name, (byPlatform.get(name) ?? 0) + getComissaoAfiliado(r));
  });
  return Array.from(byPlatform.entries())
    .map(([name, value]) => ({ name, value: Math.round(netCommission(value, tax) * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Group by channel (Shopee channelType — origem real da venda). Pend. + Concl.
 * SEM fallback para platform: channelType vazio cai em "Outros" (a Shopee não
 * preenche origem em todos os pedidos). Antes caía em platform="shopee", por isso
 * o donut mostrava só "shopee".
 */
export function groupByChannel(rows: DatasetRow[], dateRange: DateRange, tax: TaxRates = ZERO_TAX): { name: string; value: number }[] {
  const filtered = filterKpiRows(filterRowsByDateRange(rows, dateRange));
  // Valores de attributionType que o parser ANTIGO gravava em `channel` (antes do fix):
  // não são canal de origem → tratar como "Outros" até o re-sync repopular com channelType.
  const ATTR_LEAK = new Set(["ORDERED_IN_SAME_SHOP", "DIFFERENT_SHOP", "ORDERED_IN_DIFFERENT_SHOP"]);
  const byChannel = new Map<string, number>();
  filtered.forEach((r) => {
    const raw = r.channel?.trim() || "";
    const name = !raw || ATTR_LEAK.has(raw) ? "Outros" : raw;
    byChannel.set(name, (byChannel.get(name) ?? 0) + getComissaoAfiliado(r));
  });
  return Array.from(byChannel.entries())
    .map(([name, value]) => ({ name, value: Math.round(netCommission(value, tax) * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

/** Group by category, sum commission. Usa mesma fonte que kpi.ts (Pend. + Concl.). */
export function groupByCategory(rows: DatasetRow[], dateRange: DateRange, tax: TaxRates = ZERO_TAX): { name: string; value: number }[] {
  const filtered = filterKpiRows(filterRowsByDateRange(rows, dateRange));
  const byCategory = new Map<string, number>();
  filtered.forEach((r) => {
    const name = r.category?.trim() || "Sem categoria";
    byCategory.set(name, (byCategory.get(name) ?? 0) + getComissaoAfiliado(r));
  });
  return Array.from(byCategory.entries())
    .map(([name, value]) => ({ name, value: Math.round(netCommission(value, tax) * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

// ============================================================================
// Dashboard novo: cards (5), gráfico único e 3 blocos inferiores.
// Mesma lógica de imposto/ROAS Real da tela de Campanhas.
// ============================================================================

/** attributionType da Shopee que marca pedido DIRETO (clique direto, mesma loja). */
export const DIRECT_ATTRIBUTION = "ORDERED_IN_SAME_SHOP";

export type ChartMode = "day" | "month";

export interface DashTotals {
  comissao: number;      // líquida (com imposto de comissão)
  comissaoBruta: number; // sem imposto (referência)
  gasto: number;         // com markup/imposto
  gastoPago: number;     // sem imposto (referência)
  lucro: number;
  roas: number;          // ROAS Real = comissao / gasto
  orders: number;        // pedidos distintos (order_id)
  directOrders: number;  // pedidos diretos (attribution_type = ORDERED_IN_SAME_SHOP)
}

export interface DashSeriesPoint {
  key: string;   // YYYY-MM-DD (dia) ou YYYY-MM (mês) — ordenação
  label: string; // DD/MM (dia) ou MM/YY (mês)
  comissao: number;
  gasto: number;
  lucro: number;
  roas: number;
  orders: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Totais do dashboard: KPIs com imposto (reusa calcTotals) + pedidos/diretos. */
export function calcDashTotals(
  rows: DatasetRow[],
  adSpends: AdSpend[],
  opts: { dateRange?: DateRange; subIdFilter?: string; tax?: TaxRates }
): DashTotals {
  const t = calcTotals(rows, adSpends, opts);
  const kpiRows = filterKpiRows(rows);
  const allOrders = new Set<string>();
  const direct = new Set<string>();
  kpiRows.forEach((r) => {
    if (!r.order_id) return;
    const oid = String(r.order_id);
    allOrders.add(oid);
    if ((r.attribution_type || "") === DIRECT_ATTRIBUTION) direct.add(oid);
  });
  return {
    comissao: t.comissao,
    comissaoBruta: t.comissaoBruta,
    gasto: t.gastoAnuncios,
    gastoPago: t.gastoPago,
    lucro: t.lucro,
    roas: t.roas,
    orders: allOrders.size,
    directOrders: direct.size,
  };
}

function seriesLabel(key: string, mode: ChartMode): string {
  if (mode === "month") {
    const [y, m] = key.split("-");
    return y && m ? `${m}/${y.slice(2)}` : key;
  }
  const d = parseDateOnly(key);
  return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : key;
}

/**
 * Série única do gráfico (e fonte das sparklines): por dia ou por mês, com
 * comissão líquida, gasto com imposto, lucro, ROAS Real e nº de pedidos.
 */
export function buildSeries(
  rows: DatasetRow[],
  adSpends: AdSpend[],
  opts: { dateRange?: DateRange; subIdFilter?: string; tax?: TaxRates },
  mode: ChartMode
): DashSeriesPoint[] {
  const tax = opts.tax ?? ZERO_TAX;
  const kpiRows = filterKpiRows(filterRowsByDateRange(rows, opts.dateRange));

  const commByKey = new Map<string, number>();
  const ordersByKey = new Map<string, Set<string>>();
  kpiRows.forEach((r) => {
    const key = mode === "month" ? getMesAnoFromRow(r) : toDateKey(r.date);
    if (!key) return;
    commByKey.set(key, (commByKey.get(key) ?? 0) + getComissaoAfiliado(r));
    if (r.order_id) {
      if (!ordersByKey.has(key)) ordersByKey.set(key, new Set());
      ordersByKey.get(key)!.add(String(r.order_id));
    }
  });

  const spendByKey = new Map<string, number>();
  adSpends.forEach((s) => {
    if (opts.subIdFilter && normalizeSubId(s.sub_id).toLowerCase() !== opts.subIdFilter.toLowerCase()) return;
    const dk = toDateKey(s.date);
    if (!dk) return;
    if (opts.dateRange?.from && isBeforeDateKey(dk, opts.dateRange.from)) return;
    if (opts.dateRange?.to && isAfterDateKey(dk, opts.dateRange.to)) return;
    const key = mode === "month" ? dk.slice(0, 7) : dk;
    spendByKey.set(key, (spendByKey.get(key) ?? 0) + (s.amount ?? 0));
  });

  const keys = Array.from(new Set([...commByKey.keys(), ...spendByKey.keys()])).sort();
  return keys.map((key) => {
    const comissao = round2(netCommission(commByKey.get(key) ?? 0, tax));
    const gasto = round2(grossUpSpend(spendByKey.get(key) ?? 0, tax));
    const lucro = round2(comissao - gasto);
    const roas = gasto > 0 ? round2(comissao / gasto) : 0;
    const orders = ordersByKey.get(key)?.size ?? 0;
    return { key, label: seriesLabel(key, mode), comissao, gasto, lucro, roas, orders };
  });
}

/** Comissão líquida por Sub ID (pura — sem gasto/ROAS), TODOS, maior → menor. */
export function groupBySubIdCommission(rows: DatasetRow[], dateRange: DateRange, tax: TaxRates = ZERO_TAX): { name: string; value: number }[] {
  const filtered = filterKpiRows(filterRowsByDateRange(rows, dateRange));
  const bySub = new Map<string, number>();
  filtered.forEach((r) => {
    const name = normalizeSubId(r.sub_id1);
    bySub.set(name, (bySub.get(name) ?? 0) + getComissaoAfiliado(r));
  });
  return Array.from(bySub.entries())
    .map(([name, value]) => ({ name, value: round2(netCommission(value, tax)) }))
    .sort((a, b) => b.value - a.value);
}

type ClickLike = { channel?: string | null; sub_id?: string | null; clicks?: number | null };

function displayChannel(channel?: string | null): string {
  const t = (channel || "").trim();
  if (!t) return "Outros";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/**
 * B4: mapa sub_id (normalizado, lowercase) → canal dominante, derivado dos CLIQUES
 * (mesma classificação de origem que a aba Cliques: Instagram/Facebook/Outros...).
 * Para cada sub_id, escolhe o canal com mais cliques.
 */
export function buildSubIdChannelMap(clicks: ClickLike[]): Map<string, string> {
  const bySub = new Map<string, Map<string, number>>();
  clicks.forEach((c) => {
    const sub = normalizeSubId(c.sub_id || "").toLowerCase();
    if (!sub || sub === "sem sub id") return;
    const ch = displayChannel(c.channel);
    if (!bySub.has(sub)) bySub.set(sub, new Map());
    const m = bySub.get(sub)!;
    m.set(ch, (m.get(ch) ?? 0) + (c.clicks ?? 0));
  });
  const result = new Map<string, string>();
  bySub.forEach((m, sub) => {
    let best = "Outros";
    let bestN = -1;
    m.forEach((n, ch) => {
      if (n > bestN) {
        bestN = n;
        best = ch;
      }
    });
    result.set(sub, best);
  });
  return result;
}

/**
 * B4: comissão líquida por CANAL usando a classificação dos cliques (sub_id→canal).
 * Comissão cujo sub_id não tem clique mapeado cai em "Outros". A Shopee não devolve
 * canal no conversionReport — então reusa a origem que os cliques já trazem.
 */
export function groupByChannelFromClicks(
  rows: DatasetRow[],
  clicks: ClickLike[],
  dateRange: DateRange,
  tax: TaxRates = ZERO_TAX,
): { name: string; value: number }[] {
  const subToChannel = buildSubIdChannelMap(clicks);
  const filtered = filterKpiRows(filterRowsByDateRange(rows, dateRange));
  const byChannel = new Map<string, number>();
  filtered.forEach((r) => {
    const sub = normalizeSubId(r.sub_id1 || "").toLowerCase();
    const name = subToChannel.get(sub) || "Outros";
    byChannel.set(name, (byChannel.get(name) ?? 0) + getComissaoAfiliado(r));
  });
  return Array.from(byChannel.entries())
    .map(([name, value]) => ({ name, value: round2(netCommission(value, tax)) }))
    .sort((a, b) => b.value - a.value);
}

/** Comissão líquida por categoria, TODAS (sem corte), maior → menor. */
export function groupByCategoryAll(rows: DatasetRow[], dateRange: DateRange, tax: TaxRates = ZERO_TAX): { name: string; value: number }[] {
  const filtered = filterKpiRows(filterRowsByDateRange(rows, dateRange));
  const byCategory = new Map<string, number>();
  filtered.forEach((r) => {
    const name = r.category?.trim() || "Sem categoria";
    byCategory.set(name, (byCategory.get(name) ?? 0) + getComissaoAfiliado(r));
  });
  return Array.from(byCategory.entries())
    .map(([name, value]) => ({ name, value: round2(netCommission(value, tax)) }))
    .sort((a, b) => b.value - a.value);
}
