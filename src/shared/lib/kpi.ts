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

const KPI_STATUSES = ["pendente", "concluído", "concluido", "cancelado"];
const isKpiStatus = (s: string) => KPI_STATUSES.includes((s || "").toLowerCase());

/** Filtra linhas por status (Pendente, Concluído) — mesma fonte usada nos KPIs e gráficos. */
export const filterKpiRows = (rows: DatasetRow[]): DatasetRow[] =>
  rows.filter((r) => isKpiStatus(r.status || ""));

/** Contribuição em centavos (inteiro) para agregação. Dividir por 100 para obter valor final. */
export const getComissaoCents = (row: DatasetRow) =>
  Math.round(getComissaoAfiliado(row) * 100);

export const calcTotals = (
  rows: DatasetRow[],
  adSpends: AdSpend[],
  opts: { dateRange?: DateRange; subIdFilter?: string }
) => {
  const kpiRows = filterKpiRows(rows);
  // Filtrar comissões zero (pedidos sem receita)
  const kpiRowsNonZero = kpiRows.filter((r) => (r.commission || 0) > 0);

  // Trunca (Math.floor) por linha e soma — alinha ao relatório original Shopee
  const faturamento = Math.round(kpiRows.reduce((acc, r) => acc + getFaturamento(r), 0) * 100) / 100;
  const comissao = Math.round(kpiRows.reduce((acc, r) => acc + getComissaoAfiliado(r), 0) * 100) / 100;
  // Acumula centavos para evitar perda de precisão (mesmo que os gráficos)
  // const comissaoCents = kpiRowsNonZero.reduce((acc, r) => acc + Math.round((getComissaoAfiliado(r) || 0) * 100), 0);
  // const comissao = comissaoCents / 100;
  const gastoAnunciosRaw = adSpends.reduce((acc, spend) => {
    if (opts.subIdFilter && normalizeSubId(spend.sub_id).toLowerCase() !== opts.subIdFilter.toLowerCase()) return acc;
    const spendDate = toDateKey(spend.date);
    if (opts.dateRange?.from && spendDate < toDateKey(opts.dateRange.from)) return acc;
    if (opts.dateRange?.to && spendDate > toDateKey(opts.dateRange.to)) return acc;
    return acc + (spend.amount || 0);
  }, 0);

  const gastoAnuncios = Math.round(gastoAnunciosRaw * 100) / 100;
  const lucro = Math.round((comissao - gastoAnuncios) * 100) / 100;
  const roas = gastoAnuncios > 0 ? comissao / gastoAnuncios : 0;

  return { faturamento, comissao, gastoAnuncios, lucro, roas };
};
