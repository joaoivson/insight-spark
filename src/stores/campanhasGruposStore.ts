import { create } from "zustand";
import {
  atualizarCampanha,
  criarCampanha,
  duplicarCampanha,
  excluirCampanha,
  listarCampanhas,
  type CampanhaGrupos,
} from "@/services/campanhas_grupos.service";

/**
 * Lista de campanhas de grupos.
 *
 * **Revalida sempre (SWR), como o `adSpendsStore`.** O padrão anterior —
 * `if (loaded && !force) return` — servia o cache do módulo do Zustand para
 * sempre dentro da mesma sessão do SPA: a afiliada adicionava dois grupos numa
 * campanha, voltava para a listagem e via "0 grupos", porque `total_grupos`
 * nunca era rebuscado. É o mesmo defeito já catalogado em "cache stale entre
 * devices", e a correção é a mesma: hidrata do cache, revalida por baixo.
 */
type CampanhasGruposState = {
  campanhas: CampanhaGrupos[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetch: (opts?: { force?: boolean }) => Promise<void>;
  /** Cria e recarrega a lista; devolve a criada para navegar ao detalhe. */
  criar: (nome: string) => Promise<CampanhaGrupos>;
  renomear: (id: number, nome: string) => Promise<void>;
  /** Devolve a cópia para a tela poder navegar direto para ela. */
  duplicar: (id: number) => Promise<CampanhaGrupos>;
  excluir: (id: number) => Promise<void>;
};

export const useCampanhasGruposStore = create<CampanhasGruposState>((set, get) => ({
  campanhas: [],
  loaded: false,
  loading: false,
  error: null,

  fetch: async (opts = {}) => {
    // `loading` continua sendo guarda de concorrência: duas montagens no mesmo
    // tick não podem virar duas requests.
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

  criar: async (nome) => {
    const campanha = await criarCampanha(nome);
    await get().fetch({ force: true });
    return campanha;
  },

  renomear: async (id, nome) => {
    const atualizada = await atualizarCampanha(id, { nome });
    // Troca em memória em vez de refazer a lista: a resposta do PATCH já traz a
    // campanha inteira, e um GET aqui piscaria a lista sem necessidade.
    set({
      campanhas: get().campanhas.map((c) => (c.id === id ? { ...c, ...atualizada } : c)),
    });
  },

  duplicar: async (id) => {
    const nova = await duplicarCampanha(id);
    await get().fetch({ force: true });
    return nova;
  },

  excluir: async (id) => {
    await excluirCampanha(id);
    set({ campanhas: get().campanhas.filter((c) => c.id !== id) });
  },
}));
