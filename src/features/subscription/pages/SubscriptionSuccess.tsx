import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { APP_CONFIG } from "@/core/config/app.config";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect após 5 segundos
    const timer = setTimeout(() => {
      navigate(APP_CONFIG.ROUTES.LOGIN);
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
        <div>
          <h1 className="text-3xl font-bold">Pagamento Aprovado!</h1>
          <p className="text-muted-foreground mt-2">
            Sua assinatura foi ativada com sucesso. Você será redirecionado para o login em instantes.
          </p>
        </div>
        <Button onClick={() => navigate(APP_CONFIG.ROUTES.LOGIN)}>
          Fazer Login Agora
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
