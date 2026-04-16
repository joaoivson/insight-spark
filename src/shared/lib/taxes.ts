import type { AdSpend } from "@/shared/types/adspend";

export interface TaxRow {
  monthKey: string;    // "2025-01" for sorting
  month: string;       // "Jan/2025" for display
  investimento: number;
  impostosAnuncios: number;
  investimentoTotal: number;
  comissoes: number;
  impostosSaidas: number;
  lucroLiquido: number;
  margemLucro: number; // percentage
}

interface DatasetRowLike {
  date: string;
  commission: number;
  status?: string;
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function toMonthKey(dateStr: string): string {
  // Expects "YYYY-MM-DD" or "YYYY-MM"
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${MONTH_NAMES[parseInt(month, 10) - 1]}/${year}`;
}

export function calcTaxRows(
  adSpends: AdSpend[],
  rows: DatasetRowLike[],
  adTaxRate: number,
  commissionTaxRate: number
): TaxRow[] {
  // adTaxRate and commissionTaxRate are percentages (e.g. 18 means 18%)
  const adRate = adTaxRate / 100;
  const commRate = commissionTaxRate / 100;

  // Group ad spends by month
  const adByMonth: Record<string, number> = {};
  for (const spend of adSpends) {
    const key = toMonthKey(spend.date as string);
    adByMonth[key] = (adByMonth[key] ?? 0) + spend.amount;
  }

  // Group commissions by month (all statuses, same as calcTotals logic)
  const commByMonth: Record<string, number> = {};
  for (const row of rows) {
    if (!row.date) continue;
    const key = toMonthKey(row.date);
    commByMonth[key] = (commByMonth[key] ?? 0) + (row.commission ?? 0);
  }

  // Collect all months
  const allKeys = new Set([...Object.keys(adByMonth), ...Object.keys(commByMonth)]);

  const result: TaxRow[] = Array.from(allKeys)
    .sort()
    .map((key) => {
      const investimento = adByMonth[key] ?? 0;
      const comissoes = commByMonth[key] ?? 0;
      const impostosAnuncios = investimento * adRate;
      const investimentoTotal = investimento + impostosAnuncios;
      const impostosSaidas = comissoes * commRate;
      const lucroLiquido = comissoes - impostosSaidas - investimentoTotal;
      const margemLucro = comissoes > 0 ? (lucroLiquido / comissoes) * 100 : 0;

      return {
        monthKey: key,
        month: formatMonth(key),
        investimento,
        impostosAnuncios,
        investimentoTotal,
        comissoes,
        impostosSaidas,
        lucroLiquido,
        margemLucro,
      };
    });

  return result;
}

export function calcTaxTotals(rows: TaxRow[]): Omit<TaxRow, "monthKey" | "month" | "margemLucro"> & { margemLucro: number } {
  const totals = rows.reduce(
    (acc, r) => ({
      investimento: acc.investimento + r.investimento,
      impostosAnuncios: acc.impostosAnuncios + r.impostosAnuncios,
      investimentoTotal: acc.investimentoTotal + r.investimentoTotal,
      comissoes: acc.comissoes + r.comissoes,
      impostosSaidas: acc.impostosSaidas + r.impostosSaidas,
      lucroLiquido: acc.lucroLiquido + r.lucroLiquido,
    }),
    { investimento: 0, impostosAnuncios: 0, investimentoTotal: 0, comissoes: 0, impostosSaidas: 0, lucroLiquido: 0 }
  );

  return {
    ...totals,
    margemLucro: totals.comissoes > 0 ? (totals.lucroLiquido / totals.comissoes) * 100 : 0,
  };
}
