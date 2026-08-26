import { create } from "zustand";
import {
  criarCampanha,
  listarCampanhas,
  type CampanhaGrupos,
} from "@/services/campanhas_grupos.service";

/**
 * Lista de campanhas de grupos (padrão leve loaded/loading/force, como o
 * whatsappConexoesStore). O detalhe é fetch direto na página — sem cache.
 */
type CampanhasGruposState = {
  campanhas: CampanhaGrupos[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetch: (opts?: { force?: boolean }) => Promise<void>;
  /** Cria e recarrega a lista; devolve a criada para navegar ao detalhe. */
  criar: (nome: string, descricao?: string) => Promise<CampanhaGrupos>;
};

export const useCampanhasGruposStore = create<CampanhasGruposState>((set, get) => ({
  campanhas: [],
  loaded: false,
  loading: false,
  error: null,

  fetch: async (opts = {}) => {
    if (get().loaded && !opts.force) return;
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const campanhas = await listarCampanhas();
      set({ campanhas, loaded: true });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Não foi possível carregar as campanhas.",
        loaded: true,
      });
    } finally {
      set({ loading: false });
    }
  },

  criar: async (nome, descricao) => {
    const campanha = await criarCampanha(nome, descricao);
    await get().fetch({ force: true });
    return campanha;
  },
}));
