import type { DatasetRow } from "@/components/dashboard/DataTable";
import type { AdSpend } from "@/shared/types/adspend";
import { toDateKey } from "@/shared/lib/date";
import { normalizeSubId } from "@/shared/lib/utils";

export const cleanNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    let cleaned = value.replace(/R\$/gi, "").replace(/\s+/g, "");
    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");
    if (hasComma && hasDot) cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    else if (hasComma) cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const getFaturamento = (row: DatasetRow) => {
  const raw = (row as any).raw_data || {};
  return cleanNumber(raw["Valor de Compra(R$)"]);
};

export const getComissaoAfiliado = (row: DatasetRow) => {
  const raw = (row as any).raw_data || {};
  return cleanNumber(raw["Comissão líquida do afiliado(R$)"]);
};

type DateRange = { from?: Date | string | null; to?: Date | string | null };

export const calcTotals = (
  rows: DatasetRow[],
  adSpends: AdSpend[],
  opts: { dateRange?: DateRange; subIdFilter?: string }
) => {
  const faturamento = rows.reduce((acc, r) => acc + getFaturamento(r), 0);
  const comissao = rows.reduce((acc, r) => acc + getComissaoAfiliado(r), 0);
  const gastoAnuncios = adSpends.reduce((acc, spend) => {
    if (opts.subIdFilter && normalizeSubId(spend.sub_id).toLowerCase() !== opts.subIdFilter.toLowerCase()) return acc;
    const spendDate = toDateKey(spend.date);
    if (opts.dateRange?.from && spendDate < toDateKey(opts.dateRange.from)) return acc;
    if (opts.dateRange?.to && spendDate > toDateKey(opts.dateRange.to)) return acc;
    return acc + (spend.amount || 0);
  }, 0);
  const lucro = comissao - gastoAnuncios;
  const roas = gastoAnuncios > 0 ? comissao / gastoAnuncios : 0;

  return { faturamento, comissao, gastoAnuncios, lucro, roas };
};
