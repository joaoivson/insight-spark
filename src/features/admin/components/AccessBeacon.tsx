import { useEffect } from "react";
import { tokenStorage } from "@/shared/lib/storage";
import { postDailyAccess } from "@/services/admin-panel.service";

/** Beacon de último acesso — 1 registro por usuário por dia (mount autenticado). */
export function AccessBeacon() {
  useEffect(() => {
    if (!tokenStorage.get()) return;
    void postDailyAccess();
  }, []);

  return null;
}
