/**
 * Mapa único de features por plano (espelho do backend app/core/plans.py).
 * Adicionar MAX = uma entrada aqui + no backend.
 */

export type PlanId = "essencial" | "pro" | "max";
export type PeriodId = "mensal" | "trimestral" | "anual";

export type PlanConfig = {
  menus: ReadonlySet<string>;
  limites: { paginas_captura: number; links: number };
  label: string;
};

export const FEATURES: Record<PlanId, PlanConfig> = {
  essencial: {
    menus: new Set([
      "dashboard",
      "campanhas",
      "upload_cliques",
      "indique_ganhe",
      "configuracoes",
      "planos",
    ]),
    limites: { paginas_captura: 0, links: 0 },
    label: "Essencial",
  },
  pro: {
    menus: new Set([
      "dashboard",
      "campanhas",
      "upload_cliques",
      "captura",
      "meus_links",
      "indique_ganhe",
      "configuracoes",
      "planos",
    ]),
    limites: { paginas_captura: 15, links: 30 },
    label: "Pro",
  },
  max: {
    menus: new Set([
      "dashboard",
      "campanhas",
      "upload_cliques",
      "captura",
      "meus_links",
      "indique_ganhe",
      "configuracoes",
      "planos",
    ]),
    limites: { paginas_captura: 50, links: 100 },
    label: "Max",
  },
};

export const PRO_ONLY_MENUS = new Set(["captura", "meus_links"]);

export const CHECKOUT_LINKS: Record<
  string,
  { price: string; url: string }
> = {
  "essencial:mensal": { price: "47", url: "https://pay.kiwify.com.br/uMRfGkI" },
  "essencial:trimestral": { price: "117", url: "https://pay.kiwify.com.br/vkKX959" },
  "essencial:anual": { price: "327", url: "https://pay.kiwify.com.br/EZ81jlu" },
  "pro:mensal": { price: "67", url: "https://pay.kiwify.com.br/u12boOS" },
  "pro:trimestral": { price: "147", url: "https://pay.kiwify.com.br/9B9lXa6" },
  "pro:anual": { price: "447", url: "https://pay.kiwify.com.br/4lhuudg" },
};

export function normalizePlan(plan?: string | null): PlanId {
  if (!plan) return "essencial";
  const p = plan.trim().toLowerCase();
  if (p in FEATURES) return p as PlanId;
  if (["marketdash", "principal", "premium"].includes(p)) return "pro";
  if (["free", "gratis", "gratuito"].includes(p)) return "essencial";
  return "essencial";
}

export function planAllowsMenu(plan: string | null | undefined, menuKey: string): boolean {
  const cfg = FEATURES[normalizePlan(plan)];
  return cfg.menus.has(menuKey);
}

export function planLimit(plan: string | null | undefined, resource: "paginas_captura" | "links"): number {
  return FEATURES[normalizePlan(plan)].limites[resource];
}

export function checkoutFor(plano: PlanId, periodo: PeriodId) {
  return CHECKOUT_LINKS[`${plano}:${periodo}`];
}

/** Menu path → feature key used in FEATURES */
export const PATH_TO_MENU: Record<string, string> = {
  "/dashboard": "dashboard",
  "/dashboard/campanhas": "campanhas",
  "/dashboard/upload-cliques": "upload_cliques",
  "/dashboard/captura": "captura",
  "/dashboard/links": "meus_links",
  "/dashboard/indique": "indique_ganhe",
  "/dashboard/configuracoes": "configuracoes",
  "/dashboard/planos": "planos",
};
