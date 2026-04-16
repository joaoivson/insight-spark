import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";

export interface TaxSettings {
  ad_tax_rate: number;
  commission_tax_rate: number;
}

export const getTaxSettings = async (): Promise<TaxSettings> => {
  const url = getApiUrl("/api/v1/settings");
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error("Falha ao buscar configurações de impostos");
  return res.json();
};

export const updateTaxSettings = async (
  adTaxRate: number,
  commissionTaxRate: number
): Promise<TaxSettings> => {
  const url = getApiUrl("/api/v1/settings");
  const res = await fetchWithAuth(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ad_tax_rate: adTaxRate, commission_tax_rate: commissionTaxRate }),
  });
  if (!res.ok) throw new Error("Falha ao salvar configurações de impostos");
  return res.json();
};
