import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { APP_CONFIG } from "@/core/config/app.config";
import { caktoService } from "@/services/cakto.service";
import { userStorage } from "@/shared/lib/storage";

const SubscriptionError = () => {
  const navigate = useNavigate();

  const handleTryAgain = async () => {
    try {
      const user = userStorage.get() as { email?: string; name?: string; cpf_cnpj?: string } | null;
      if (user) {
        await caktoService.redirectToCheckout({
          email: user.email,
          name: user.name,
          cpf_cnpj: user.cpf_cnpj,
        });
      } else {
        caktoService.redirectToCheckoutDirect();
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
          <h1 className="text-3xl font-bold">Erro no Pagamento</h1>
          <p className="text-muted-foreground mt-2">
            Não foi possível processar seu pagamento. Por favor, tente novamente.
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            Voltar ao Início
          </Button>
          <Button onClick={handleTryAgain}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionError;
