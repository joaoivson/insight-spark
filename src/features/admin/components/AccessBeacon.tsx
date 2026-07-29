import { useEffect } from "react";
import { tokenStorage } from "@/shared/lib/storage";
import { supabase } from "@/shared/lib/supabase";
import { postDailyAccess } from "@/services/admin-panel.service";

const RETRY_DELAYS_MS = [0, 50, 150, 400, 1000, 2000];

/** Beacon de último acesso — 1 registro por usuário por dia (mount autenticado). */
export function AccessBeacon() {
  useEffect(() => {
    let sent = false;
    let cancelled = false;
    const timerIds: ReturnType<typeof setTimeout>[] = [];

    const maybeSend = () => {
      if (cancelled || sent || !tokenStorage.get()) return;
      sent = true;
      void postDailyAccess();
    };

    const clearTimers = () => {
      for (const id of timerIds) clearTimeout(id);
      timerIds.length = 0;
    };

    const scheduleRetries = () => {
      if (cancelled || sent) return;
      clearTimers();
      for (const delay of RETRY_DELAYS_MS) {
        timerIds.push(setTimeout(maybeSend, delay));
      }
    };

    scheduleRetries();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.access_token &&
        (event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "INITIAL_SESSION")
      ) {
        scheduleRetries();
      }
    });

    return () => {
      cancelled = true;
      clearTimers();
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
