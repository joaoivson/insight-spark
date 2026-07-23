import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { tokenStorage } from "@/shared/lib/storage";
import { postPageView } from "@/services/admin-panel.service";

/** Beacon leve de page_views em mudança de rota (usuário autenticado). */
export function PageViewBeacon() {
  const location = useLocation();

  useEffect(() => {
    if (!tokenStorage.get()) return;
    void postPageView(location.pathname);
  }, [location.pathname]);

  return null;
}
