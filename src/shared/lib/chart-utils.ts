import type { DatasetRow } from "@/components/dashboard/DataTable";
import type { AdSpend } from "@/shared/types/adspend";
import { parseDateOnly, toDateKey, isBeforeDateKey, isAfterDateKey } from "@/shared/lib/date";
import { getComissaoAfiliado } from "@/shared/lib/kpi";
import { normalizeSubId } from "@/shared/lib/utils";

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

/** Group rows by month (mes_ano), sum commission. Returns { label, value, key }[] for bar chart. */
export function groupByMesAno(rows: DatasetRow[], dateRange: DateRange): { label: string; value: number; key: string }[] {
  const filtered = filterRowsByDateRange(rows, dateRange);
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
      return { label, value, key };
    });
}

/** Group rows by day, sum commission. Returns { label, value, key }[] for bar chart. */
export function groupCommissionByDay(rows: DatasetRow[], dateRange: DateRange): { label: string; value: number; key: string }[] {
  const filtered = filterRowsByDateRange(rows, dateRange);
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
      const label = d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : key;
      return { label, value, key };
    });
}

/** Group by month: commission from rows, cost from adSpends (filtered by dateRange + subIdFilter), profit = commission - cost. */
export function groupRevenueProfitByMes(
  rows: DatasetRow[],
  adSpends: AdSpend[],
  dateRange: DateRange,
  subIdFilter?: string
): { mes_ano: string; commission: number; cost: number; profit: number }[] {
  const filteredRows = filterRowsByDateRange(rows, dateRange);
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
      const commission = byMonth.get(mes_ano) ?? 0;
      const cost = costByMonth.get(mes_ano) ?? 0;
      const profit = commission - cost;
      return { mes_ano, commission, cost, profit };
    });
}

/** Group by platform (sub_id1 or platform), sum commission. Returns { name, value }[] for pie chart. */
export function groupByPlatform(rows: DatasetRow[], dateRange: DateRange): { name: string; value: number }[] {
  const filtered = filterRowsByDateRange(rows, dateRange);
  const byPlatform = new Map<string, number>();
  filtered.forEach((r) => {
    const name = normalizeSubId(r.sub_id1 || r.platform || "Outros");
    byPlatform.set(name, (byPlatform.get(name) ?? 0) + getComissaoAfiliado(r));
  });
  return Array.from(byPlatform.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** Group by category, sum commission. Returns { name, value }[] for bar chart (top 12). */
export function groupByCategory(rows: DatasetRow[], dateRange: DateRange): { name: string; value: number }[] {
  const filtered = filterRowsByDateRange(rows, dateRange);
  const byCategory = new Map<string, number>();
  filtered.forEach((r) => {
    const name = r.category?.trim() || "Sem categoria";
    byCategory.set(name, (byCategory.get(name) ?? 0) + getComissaoAfiliado(r));
  });
  return Array.from(byCategory.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}
