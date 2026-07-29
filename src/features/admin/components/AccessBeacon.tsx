import { useEffect } from "react";
import { tokenStorage } from "@/shared/lib/storage";
import { supabase } from "@/shared/lib/supabase";
import { postDailyAccess } from "@/services/admin-panel.service";

/** Beacon de último acesso — 1 registro por usuário por dia (mount autenticado). */
export function AccessBeacon() {
  useEffect(() => {
    let sent = false;

    const maybeSend = () => {
      if (sent || !tokenStorage.get()) return;
      sent = true;
      void postDailyAccess();
    };

    maybeSend();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.access_token &&
        (event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "INITIAL_SESSION")
      ) {
        maybeSend();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
