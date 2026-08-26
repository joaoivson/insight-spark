/**
 * Mapa único de features por plano (espelho do backend app/core/plans.py).
 * Adicionar MAX = uma entrada aqui + no backend.
 */

export type PlanId = "essencial" | "pro" | "max";
export type PeriodId = "mensal" | "trimestral" | "anual";

export type PlanConfig = {
  menus: ReadonlySet<string>;
  limites: {
    paginas_captura: number;
    links: number;
    whatsapp_numeros: number;
    whatsapp_grupos: number;
    campanhas_grupos: number;
  };
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
    limites: {
      paginas_captura: 0,
      links: 0,
      whatsapp_numeros: 0,
      whatsapp_grupos: 0,
      campanhas_grupos: 0,
    },
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
    limites: {
      paginas_captura: 15,
      links: 30,
      whatsapp_numeros: 0,
      whatsapp_grupos: 0,
      campanhas_grupos: 0,
    },
    label: "Pro",
  },
  max: {
    menus: new Set([
      "dashboard",
      "campanhas",
      "upload_cliques",
      "captura",
      "meus_links",
      // Automação Instagram (comentário → direct) é exclusiva do MAX.
      "automacoes",
      // Campanhas de grupos de WhatsApp também são exclusivas do MAX.
      "campanhas_grupos",
      // Templates de mensagem (variações + IA) atendem as campanhas de grupos.
      "templates",
      "indique_ganhe",
      "configuracoes",
      "planos",
    ]),
    limites: {
      paginas_captura: -1,
      links: -1,
      whatsapp_numeros: 3,
      whatsapp_grupos: -1,
      campanhas_grupos: -1,
    },
    label: "Max",
  },
};

/** Sentinela de "ilimitado" — espelha UNLIMITED/is_unlimited de app/core/plans.py. */
export const UNLIMITED = -1;
export function isUnlimited(value: number): boolean {
  return value === UNLIMITED;
}

export const PRO_ONLY_MENUS = new Set(["captura", "meus_links"]);

/** Menus exclusivos do MAX (cadeado no Essencial E no Pro). */
export const MAX_ONLY_MENUS = new Set(["automacoes", "campanhas_grupos", "templates"]);

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
  "max:mensal": { price: "97", url: "https://pay.kiwify.com.br/rTfikTj" },
  "max:trimestral": { price: "207", url: "https://pay.kiwify.com.br/HPql4oU" },
  "max:anual": { price: "627", url: "https://pay.kiwify.com.br/5l1Sdau" },
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

export function planLimit(
  plan: string | null | undefined,
  resource: keyof PlanConfig["limites"],
): number {
  return FEATURES[normalizePlan(plan)].limites[resource];
}

export function checkoutFor(plano: PlanId, periodo: PeriodId) {
  return CHECKOUT_LINKS[`${plano}:${periodo}`];
}

/** Menu path → feature key used in FEATURES */
// O mapa PATH_TO_MENU foi removido em 25/08: a fonte de rota→menuKey é
// src/shared/config/dashboard-menu.ts (config única dos dois navs).

