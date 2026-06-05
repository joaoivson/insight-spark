/**
 * Impostos aplicados em TEMPO DE CÁLCULO (nunca gravados no banco).
 *
 * O usuário lança em "Custos de Anúncios" o valor que pagou de mídia (o que
 * aparece no Meta). O markup do Meta e o imposto sobre comissão são aplicados
 * apenas na hora de calcular/exibir — assim, mudar o % recalcula todo o
 * histórico e todos os dashboards automaticamente.
 *
 * Fórmulas:
 *   Gasto_com_imposto = Gasto_pago × (1 + imposto_anuncios_pct)
 *   Comissão_líquida  = Comissão   × (1 − imposto_comissao_pct)
 *   Lucro             = Comissão_líquida − Gasto_com_imposto
 *   ROAS              = Comissão_líquida ÷ Gasto_com_imposto
 *
 * As taxas são percentuais (ex.: 17.65 = 17,65%), iguais a UserSettings.
 */
export interface TaxRates {
  /** Markup do Meta sobre o gasto de mídia, em % (ex.: 17.65). */
  adTaxRate: number;
  /** Imposto sobre a comissão, em % (ex.: 6). */
  commissionTaxRate: number;
}

export const ZERO_TAX: TaxRates = { adTaxRate: 0, commissionTaxRate: 0 };

/** Aplica o markup de imposto sobre o gasto de mídia pago. */
export const grossUpSpend = (spend: number, tax: TaxRates = ZERO_TAX): number =>
  spend * (1 + (tax?.adTaxRate ?? 0) / 100);

/** Aplica o imposto sobre a comissão, retornando a comissão líquida. */
export const netCommission = (commission: number, tax: TaxRates = ZERO_TAX): number =>
  commission * (1 - (tax?.commissionTaxRate ?? 0) / 100);
