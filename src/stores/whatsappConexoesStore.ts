import { create } from "zustand";
import {
  atualizarInstancia,
  criarInstancia,
  listarGrupos,
  listarInstancias,
  removerInstancia,
  sincronizarGrupos,
  type GrupoWhatsapp,
  type InstanciaConexao,
  type ResultadoSincronizacao,
} from "@/services/whatsapp_conexoes.service";

type WhatsappConexoesState = {
  instancias: InstanciaConexao[];
  grupos: GrupoWhatsapp[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetch: (opts?: { force?: boolean }) => Promise<void>;
  /** Cria a instância e recarrega a lista; devolve a criada para abrir o QR direto. */
  criar: (nomeExibicao?: string) => Promise<InstanciaConexao>;
  remover: (id: number) => Promise<void>;
  sincronizar: (id: number) => Promise<ResultadoSincronizacao>;
  renomear: (id: number, nome: string) => Promise<void>;
  /** Otimista: o switch tem que responder ao toque, não ao round-trip. */
  definirPausa: (id: number, pausado: boolean) => Promise<void>;
};

export const useWhatsappConexoesStore = create<WhatsappConexoesState>((set, get) => ({
  instancias: [],
  grupos: [],
  loaded: false,
  loading: false,
  error: null,

  fetch: async (opts = {}) => {
    if (get().loaded && !opts.force) return;
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const [instancias, grupos] = await Promise.all([listarInstancias(), listarGrupos()]);
      set({ instancias, grupos, loaded: true });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Não foi possível carregar os números.",
        loaded: true,
      });
    } finally {
      set({ loading: false });
    }
  },

  criar: async (nomeExibicao) => {
    const instancia = await criarInstancia(nomeExibicao);
    await get().fetch({ force: true });
    return instancia;
  },

  remover: async (id) => {
    await removerInstancia(id);
    await get().fetch({ force: true });
  },

  renomear: async (id, nome) => {
    await atualizarInstancia(id, { nome_exibicao: nome });
    await get().fetch({ force: true });
  },

  definirPausa: async (id, pausado) => {
    // Sem o otimismo o switch fica preso até o servidor responder e a
    // afiliada clica de novo, achando que não pegou.
    const antes = get().instancias;
    set({ instancias: antes.map((i) => (i.id === id ? { ...i, envio_pausado: pausado } : i)) });
    try {
      await atualizarInstancia(id, { envio_pausado: pausado });
    } catch (e) {
      set({ instancias: antes });   // reverte: a tela não pode mentir
      throw e;
    }
    await get().fetch({ force: true });
  },

  sincronizar: async (id) => {
    const resultado = await sincronizarGrupos(id);
    await get().fetch({ force: true });
    return resultado;
  },
}));
