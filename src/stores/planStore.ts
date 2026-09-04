import { create } from "zustand";
import { getPlanContext, type PlanContext } from "@/services/plan.service";
import { normalizePlan, planAllowsMenu, type PlanId } from "@/shared/lib/plans";

type PlanState = {
  context: PlanContext | null;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetch: (opts?: { force?: boolean }) => Promise<void>;
  allowsMenu: (menuKey: string) => boolean;
  /** Módulo em beta liberado para esta conta (§ Subida para produção). */
  moduloLiberado: (modulo: string) => boolean;
  plan: PlanId;
  isDemo: boolean;
};

/** Disparo em grupo: WhatsApp, Operação › Parâmetros e o menu Campanhas. */
export const MODULO_GRUPOS_WHATSAPP = "grupos_whatsapp";

export const usePlanStore = create<PlanState>((set, get) => ({
  context: null,
  loaded: false,
  loading: false,
  error: null,

  plan: "essencial",
  isDemo: false,

  fetch: async (opts = {}) => {
    if (get().loaded && !opts.force) return;
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const context = await getPlanContext();
      set({
        context,
        loaded: true,
        plan: normalizePlan(context.plano),
        isDemo: Boolean(context.is_demo),
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Erro ao carregar plano",
        loaded: true,
      });
    } finally {
      set({ loading: false });
    }
  },

  allowsMenu: (menuKey: string) => {
    const ctx = get().context;
    if (ctx?.menus?.length) return ctx.menus.includes(menuKey);
    return planAllowsMenu(get().plan, menuKey);
  },

  // Fechado por padrão: enquanto o contexto não chegou (ou veio de um backend
  // antigo, sem o campo), módulo em beta NÃO aparece. O default oposto abriria
  // WhatsApp e Campanhas em produção no intervalo entre o paint e a resposta.
  moduloLiberado: (modulo: string) => Boolean(get().context?.modulos?.includes(modulo)),
}));
