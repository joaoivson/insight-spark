import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { usePlanStore } from "@/stores/planStore";

/** Redireciona para /dashboard/planos se o plano não libera o menu. */
export function RequirePlan({
  menuKey,
  element,
}: {
  menuKey: string;
  element: JSX.Element;
}) {
  const { loaded, loading, fetch, allowsMenu } = usePlanStore();

  useEffect(() => {
    void fetch();
  }, [fetch]);

  if (!loaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowsMenu(menuKey)) {
    return <Navigate to="/dashboard/planos" replace />;
  }

  return element;
}
