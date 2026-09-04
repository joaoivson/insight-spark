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
  max_only_menus: string[];
  /**
   * Módulos em beta liberados PARA ESTA CONTA (§ Subida para produção).
   * Vem do backend (`feature-flags.json` + env `MODULOS_BETA`) para poder
   * liberar em beta sem redeploy — o gate por hostname era build-time.
   * Ausente em resposta antiga do backend: quem lê trata como lista vazia.
   */
  modulos?: string[];
  // Sentinelas: -1 = ilimitado; 0 = plano não tem o recurso (exibir travessão).
  limites: {
    paginas_captura: number;
    links: number;
    whatsapp_numeros?: number;
    whatsapp_grupos?: number;
    campanhas_grupos?: number;
    monitoramentos?: number;
    whatsapp_msgs_dia?: number;
  };
  limites_paginas_captura: number;
  limites_links: number;
  limites_whatsapp_numeros?: number;
  // Consumo atual (10.3) — para exibir "usado/limite" na tela de assinatura.
  uso?: {
    links: number;
    paginas_captura: number;
    whatsapp_numeros: number;
    whatsapp_grupos_ativos: number;
  };
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
