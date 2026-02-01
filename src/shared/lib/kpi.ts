import type { DatasetRow } from "@/components/dashboard/DataTable";
import type { AdSpend } from "@/shared/types/adspend";
import { toDateKey } from "@/shared/lib/date";
import { normalizeSubId } from "@/shared/lib/utils";

export const getFaturamento = (row: DatasetRow) => {
  return row.revenue || 0;
};

export const getComissaoAfiliado = (row: DatasetRow) => {
  return row.commission || 0;
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
