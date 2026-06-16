import type { DatasetRow } from "@/components/dashboard/DataTable";
import type { AdSpend } from "@/shared/types/adspend";
import { toDateKey } from "@/shared/lib/date";
import { normalizeSubId } from "@/shared/lib/utils";
import { grossUpSpend, netCommission, ZERO_TAX, type TaxRates } from "@/shared/lib/tax";

export const getFaturamento = (row: DatasetRow) => {
  return row.revenue || 0;
};

export const getComissaoAfiliado = (row: DatasetRow) => {
  return row.commission || 0;
};

type DateRange = { from?: Date | string | null; to?: Date | string | null };

const KPI_STATUSES = ["pendente", "concluído", "concluido", "cancelado", "pending", "completed", "cancelled"];
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
  opts: { dateRange?: DateRange; subIdFilter?: string; tax?: TaxRates }
) => {
  const tax = opts.tax ?? ZERO_TAX;
  // NB: espera `rows` JÁ filtradas por dateRange pelo chamador (o Dashboard passa filteredRows).
  // O gasto (adSpends) é filtrado por data/subId aqui mesmo, logo abaixo.
  const kpiRows = filterKpiRows(rows);

  // Trunca (Math.floor) por linha e soma — alinha ao relatório original Shopee
  const faturamento = Math.round(kpiRows.reduce((acc, r) => acc + getFaturamento(r), 0) * 100) / 100;
  const comissaoBruta = Math.round(kpiRows.reduce((acc, r) => acc + getComissaoAfiliado(r), 0) * 100) / 100;
  const gastoPagoRaw = adSpends.reduce((acc, spend) => {
    if (opts.subIdFilter && normalizeSubId(spend.sub_id).toLowerCase() !== opts.subIdFilter.toLowerCase()) return acc;
    const spendDate = toDateKey(spend.date);
    if (opts.dateRange?.from && spendDate < toDateKey(opts.dateRange.from)) return acc;
    if (opts.dateRange?.to && spendDate > toDateKey(opts.dateRange.to)) return acc;
    return acc + (spend.amount || 0);
  }, 0);
  const gastoPago = Math.round(gastoPagoRaw * 100) / 100;

  // Imposto aplicado em tempo de cálculo (ver tax.ts):
  // comissão líquida = comissão × (1 − imposto_comissão); gasto com imposto = gasto × (1 + markup_ads)
  const comissao = Math.round(netCommission(comissaoBruta, tax) * 100) / 100;
  const gastoAnuncios = Math.round(grossUpSpend(gastoPago, tax) * 100) / 100;
  const lucro = Math.round((comissao - gastoAnuncios) * 100) / 100;
  const roas = gastoAnuncios > 0 ? Math.round((comissao / gastoAnuncios) * 100) / 100 : 0;

  // `comissao`/`gastoAnuncios` já vêm com imposto aplicado (líquida / com markup).
  // `comissaoBruta`/`gastoPago` expõem os valores sem imposto quando necessário.
  return { faturamento, comissao, gastoAnuncios, lucro, roas, comissaoBruta, gastoPago };
};
