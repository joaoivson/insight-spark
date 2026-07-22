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
  plan: PlanId;
  isDemo: boolean;
};

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
}));
