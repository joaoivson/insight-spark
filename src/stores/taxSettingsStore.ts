import { create } from "zustand";
import { getTaxSettings, updateTaxSettings } from "@/services/tax_settings.service";
import type { TaxRates } from "@/shared/lib/tax";

type TaxSettingsState = TaxRates & {
  loaded: boolean;
  loading: boolean;
  /** Carrega as alíquotas do backend (uma vez, salvo force). */
  fetch: (opts?: { force?: boolean }) => Promise<void>;
  /** Salva e atualiza o estado em memória (dispara recálculo em todos os dashboards). */
  save: (adTaxRate: number, commissionTaxRate: number) => Promise<void>;
};

export const useTaxSettingsStore = create<TaxSettingsState>((set, get) => ({
  adTaxRate: 0,
  commissionTaxRate: 0,
  loaded: false,
  loading: false,

  fetch: async (opts = {}) => {
    if (get().loaded && !opts.force) return;
    if (get().loading) return;
    set({ loading: true });
    try {
      const s = await getTaxSettings();
      set({
        adTaxRate: s.ad_tax_rate ?? 0,
        commissionTaxRate: s.commission_tax_rate ?? 0,
        loaded: true,
      });
    } catch {
      // mantém zero (sem imposto) se falhar — não bloqueia dashboards
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  save: async (adTaxRate, commissionTaxRate) => {
    const s = await updateTaxSettings(adTaxRate, commissionTaxRate);
    set({
      adTaxRate: s.ad_tax_rate ?? adTaxRate,
      commissionTaxRate: s.commission_tax_rate ?? commissionTaxRate,
      loaded: true,
    });
  },
}));
