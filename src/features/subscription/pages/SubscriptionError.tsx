import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { APP_CONFIG } from "@/core/config/app.config";

const SubscriptionError = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <XCircle className="w-20 h-20 text-destructive mx-auto" />
        <div>
          <h1 className="text-3xl font-bold">Erro no Pagamento</h1>
          <p className="text-muted-foreground mt-2">
            Não foi possível processar seu pagamento. Por favor, tente novamente.
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            Voltar ao Início
          </Button>
          <Button onClick={() => navigate("/assinatura")}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionError;
