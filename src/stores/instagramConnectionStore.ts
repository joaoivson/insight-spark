import { create } from "zustand";
import { getInstagramConnection } from "@/services/instagram.service";
import type { InstagramConnection } from "@/shared/types/instagram";

type InstagramConnStore = {
  connection: InstagramConnection | null;
  loaded: boolean;
  loading: boolean;
  fetch: (opts?: { force?: boolean }) => Promise<void>;
  /** Só `ativo` conta como conectado — expirado/revogado não envia nada. */
  conectado: () => boolean;
};

export const useInstagramConnectionStore = create<InstagramConnStore>((set, get) => ({
  connection: null,
  loaded: false,
  loading: false,

  fetch: async (opts = {}) => {
    if (get().loaded && !opts.force) return;
    if (get().loading) return;
    set({ loading: true });
    try {
      set({ connection: await getInstagramConnection(), loaded: true });
    } catch {
      set({ connection: null, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  conectado: () => get().connection?.status === "ativo",
}));
