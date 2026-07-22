import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";
import type { PlanId, PeriodId } from "@/shared/lib/plans";

export type PlanCheckout = {
  plano: PlanId;
  periodo: PeriodId;
  price: string;
  url: string;
  label: string;
};

export type PlanContext = {
  plano: PlanId;
  plano_label: string;
  periodo: PeriodId | string;
  assinatura_status: string;
  assinatura_vence_em: string | null;
  is_active: boolean;
  is_demo: boolean;
  menus: string[];
  pro_only_menus: string[];
  limites: { paginas_captura: number; links: number };
  limites_paginas_captura: number;
  limites_links: number;
  checkouts: PlanCheckout[];
};

export const getPlanContext = async (): Promise<PlanContext> => {
  const url = getApiUrl("/api/v1/subscription/plan");
  const res = await fetchWithAuth(url, { method: "GET" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      (typeof error.detail === "string" ? error.detail : error.message) ||
        "Erro ao carregar plano",
    );
  }
  return res.json();
};
