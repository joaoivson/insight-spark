import { create } from "zustand";
import {
  atualizarProxy,
  buscarPool,
  criarProxy,
  desativarProxy,
  realocarProxy,
  verificarProxy,
  type Pool,
  type Proxy,
  type ProxyAtualizar,
  type ProxyCriar,
  type RealocarResultado,
  type VerificacaoProxy,
} from "@/services/admin-proxies.service";

type AdminProxiesState = {
  pool: Pool | null;
  loading: boolean;
  error: string | null;
  fetch: (opts?: { force?: boolean }) => Promise<void>;
  criar: (dados: ProxyCriar) => Promise<Proxy>;
  atualizar: (id: number, dados: ProxyAtualizar) => Promise<Proxy>;
  desativar: (id: number) => Promise<void>;
  verificar: (id: number) => Promise<VerificacaoProxy>;
  realocar: (
    instanciaId: number,
    dados: { motivo: string; ignorar_cooldown?: boolean; aplicar_na_sessao?: boolean },
  ) => Promise<RealocarResultado>;
};

/**
 * Toda mutação recarrega o pool: ocupação e status são derivados no backend
 * (contagem por proxy, afinidade, cooldown) e recalcular no cliente daria uma
 * segunda verdade — que é como uma tela começa a mentir sobre capacidade.
 */
export const useAdminProxiesStore = create<AdminProxiesState>((set, get) => ({
  pool: null,
  loading: false,
  error: null,

  fetch: async (opts = {}) => {
    if (get().loading) return;
    if (get().pool && !opts.force) return;
    set({ loading: true, error: null });
    try {
      set({ pool: await buscarPool() });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Não foi possível carregar o pool." });
    } finally {
      set({ loading: false });
    }
  },

  criar: async (dados) => {
    const proxy = await criarProxy(dados);
    await get().fetch({ force: true });
    return proxy;
  },

  atualizar: async (id, dados) => {
    const proxy = await atualizarProxy(id, dados);
    await get().fetch({ force: true });
    return proxy;
  },

  desativar: async (id) => {
    await desativarProxy(id);
    await get().fetch({ force: true });
  },

  verificar: async (id) => {
    const r = await verificarProxy(id);
    await get().fetch({ force: true });
    return r;
  },

  realocar: async (instanciaId, dados) => {
    const r = await realocarProxy(instanciaId, dados);
    await get().fetch({ force: true });
    return r;
  },
}));
