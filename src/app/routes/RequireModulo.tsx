import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { usePlanStore } from "@/stores/planStore";

/**
 * Gate de MÓDULO EM BETA (§ Subida para produção).
 *
 * O layout novo sobe inteiro e o que ainda não foi liberado some por flag do
 * backend — não por `isProductionHost()`, que era build-time e obrigava
 * redeploy para abrir um beta, nem por código comentado.
 *
 * É um wrapper de elemento, não um `{cond && <Route/>}`: a lista de módulos
 * chega junto com o contexto de plano, e não registrar a rota enquanto ela não
 * chega faz o link direto cair em 404 por uma fração de segundo antes de
 * passar a existir. Aqui a rota existe sempre e a decisão espera o contexto.
 *
 * Não confundir com `RequirePlan`, que responde "o plano libera esse menu?".
 */
export function RequireModulo({
  modulo,
  element,
}: {
  modulo: string;
  element: JSX.Element;
}) {
  const { loaded, loading, fetch, moduloLiberado } = usePlanStore();

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

  // Dashboard, não /dashboard/planos: o módulo não está fechado por plano —
  // está fechado para todo mundo ainda. Mandar para a página de planos
  // ofereceria um upgrade que não destrava nada.
  if (!moduloLiberado(modulo)) {
    return <Navigate to="/dashboard" replace />;
  }

  return element;
}
