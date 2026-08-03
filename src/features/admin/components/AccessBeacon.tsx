import { useEffect } from "react";
import { tokenStorage } from "@/shared/lib/storage";
import { supabase } from "@/shared/lib/supabase";
import { postDailyAccess } from "@/services/admin-panel.service";

/**
 * Beacon de acesso — dispara em cada AUTENTICAÇÃO, não a cada montagem.
 *
 * Só escuta SIGNED_IN de propósito:
 *  - TOKEN_REFRESHED é renovação silenciosa com a pessoa ativa → não é acesso novo;
 *  - INITIAL_SESSION é reload de página com sessão existente → também não é.
 * Sessão que cai e novo login geram um SIGNED_IN cada, que é o comportamento
 * desejado. O backend colapsa disparo duplo da mesma autenticação (a tela de
 * login também chama o beacon) numa janela curta.
 */
export function AccessBeacon() {
  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session?.access_token && tokenStorage.get()) {
        void postDailyAccess();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
