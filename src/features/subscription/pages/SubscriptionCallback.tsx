import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { APP_CONFIG } from "@/core/config/app.config";
import { useSubscriptionCheck } from "@/shared/hooks/useSubscriptionCheck";
import { tokenStorage, userStorage } from "@/shared/lib/storage";
import { caktoService } from "@/services/cakto.service";

const SubscriptionCallback = () => {
  const navigate = useNavigate();
  const { status, loading, isActive, refetch } = useSubscriptionCheck({ redirectOnInactive: false });
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const isAuthenticated = !!tokenStorage.get();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Aguardar alguns segundos para o webhook processar
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verificar assinatura (tanto para usuário logado quanto novo)
        if (isAuthenticated) {
          await refetch();
          
          if (isActive) {
            setProcessingStatus('success');
            // Auto-redirect para dashboard após 2 segundos
            setTimeout(() => {
              navigate(APP_CONFIG.ROUTES.DASHBOARD);
            }, 2000);
          } else {
            // Se ainda não está ativo, aguardar mais um pouco e tentar novamente
            await new Promise(resolve => setTimeout(resolve, 2000));
            await refetch();
            if (isActive) {
              setProcessingStatus('success');
              setTimeout(() => {
                navigate(APP_CONFIG.ROUTES.DASHBOARD);
              }, 2000);
            } else {
              setProcessingStatus('error');
            }
          }
        } else {
          // Usuário novo: redirecionar para login, que depois redireciona para dashboard
          setProcessingStatus('success');
          // Auto-redirect para login após 2 segundos
          setTimeout(() => {
            navigate(APP_CONFIG.ROUTES.LOGIN);
          }, 2000);
        }
      } catch (error) {
        console.error('Erro ao processar callback:', error);
        setProcessingStatus('error');
      }
    };
    
    processCallback();
  }, [isAuthenticated, refetch, isActive, navigate]);

  if (processingStatus === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <Loader2 className="w-20 h-20 animate-spin mx-auto text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Processando sua assinatura...</h1>
            <p className="text-muted-foreground mt-2">
              Aguarde enquanto confirmamos seu pagamento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (processingStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
          <div>
            <h1 className="text-3xl font-bold">Assinatura Confirmada!</h1>
            {isAuthenticated ? (
              <>
                <p className="text-muted-foreground mt-2">
                  Sua assinatura foi ativada com sucesso.
                </p>
                <p className="text-muted-foreground">
                  Redirecionando para o dashboard...
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mt-2">
                  Sua assinatura foi confirmada.
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                    📧 Senha provisória enviada por email
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Verifique sua caixa de entrada (e spam) para acessar sua conta.
                  </p>
                </div>
                <p className="text-muted-foreground mt-4">
                  Redirecionando para o login...
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <XCircle className="w-20 h-20 text-destructive mx-auto" />
        <div>
          <h1 className="text-3xl font-bold">Erro ao Processar Assinatura</h1>
          <p className="text-muted-foreground mt-2">
            Houve um problema ao confirmar sua assinatura.
          </p>
          <p className="text-muted-foreground">
            Entre em contato com o suporte ou tente novamente.
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            Voltar ao Início
          </Button>
          <Button onClick={async () => {
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
          }}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCallback;
