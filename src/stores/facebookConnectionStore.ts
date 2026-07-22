import { create } from "zustand";
import { getFacebookStatus, validateFacebookToken } from "@/services/facebook.service";
import type { FacebookConnectionState } from "@/features/dashboard/components/FacebookConnectionBanner";

type FacebookConnState = {
  connectionState: FacebookConnectionState;
  loaded: boolean;
  loading: boolean;
  fetch: (opts?: { force?: boolean }) => Promise<void>;
};

export const useFacebookConnectionStore = create<FacebookConnState>((set, get) => ({
  connectionState: "nunca",
  loaded: false,
  loading: false,

  fetch: async (opts = {}) => {
    if (get().loaded && !opts.force) return;
    if (get().loading) return;
    set({ loading: true });
    try {
      const status = await getFacebookStatus();
      if (status?.connection_state) {
        set({ connectionState: status.connection_state, loaded: true });
        return;
      }
      const validated = await validateFacebookToken();
      const state = (validated.connection_state || validated.status || "nunca") as FacebookConnectionState;
      set({ connectionState: state, loaded: true });
    } catch {
      set({ connectionState: "nunca", loaded: true });
    } finally {
      set({ loading: false });
    }
  },
}));
