import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { APP_CONFIG } from "@/core/config/app.config";
import { paymentService } from "@/services/payment.service";
import { userStorage } from "@/shared/lib/storage";

const SubscriptionError = () => {
  const navigate = useNavigate();

  const handleTryAgain = async () => {
    try {
      const user = userStorage.get() as { email?: string; name?: string; cpf_cnpj?: string } | null;
      if (user) {
        await paymentService.redirectToCheckout({
          email: user.email,
          name: user.name,
          cpf_cnpj: user.cpf_cnpj,
        });
      } else {
        paymentService.redirectToCheckoutDirect();
      }
    } catch (error) {
      console.error('Erro ao redirecionar para checkout:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <XCircle className="w-20 h-20 text-destructive mx-auto" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Erro no Pagamento</h1>
          <p className="text-muted-foreground mt-2">
            Não foi possível processar seu pagamento. Por favor, tente novamente.
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-center">
          <Button variant="outline" className="h-11 w-full sm:w-auto" onClick={() => navigate("/")}>
            Voltar ao Início
          </Button>
          <Button className="h-11 w-full sm:w-auto" onClick={handleTryAgain}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionError;
