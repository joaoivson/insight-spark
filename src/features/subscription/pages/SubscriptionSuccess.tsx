import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { APP_CONFIG } from "@/core/config/app.config";
import { tokenStorage } from "@/shared/lib/storage";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const isAuthenticated = !!tokenStorage.get();

  useEffect(() => {
    // Se já estiver autenticado, redirecionar para dashboard
    // Se não, redirecionar para login
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigate(APP_CONFIG.ROUTES.DASHBOARD);
      } else {
        navigate(APP_CONFIG.ROUTES.LOGIN);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
        <div>
          <h1 className="text-3xl font-bold">Pagamento Aprovado!</h1>
          <p className="text-muted-foreground mt-2">
            Sua assinatura foi ativada com sucesso.
          </p>
          {isAuthenticated ? (
            <p className="text-muted-foreground">
              Redirecionando para o dashboard...
            </p>
          ) : (
            <>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  📧 Senha provisória enviada por email
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Verifique sua caixa de entrada (e spam) para acessar sua conta.
                </p>
              </div>
              <p className="text-muted-foreground mt-4">
                Você será redirecionado para o login em instantes.
              </p>
            </>
          )}
        </div>
        {isAuthenticated ? (
          <Button onClick={() => navigate(APP_CONFIG.ROUTES.DASHBOARD)}>
            Ir para Dashboard
          </Button>
        ) : (
          <Button onClick={() => navigate(APP_CONFIG.ROUTES.LOGIN)}>
            Fazer Login Agora
          </Button>
        )}
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
