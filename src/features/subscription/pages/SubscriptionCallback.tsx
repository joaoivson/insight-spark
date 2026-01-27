import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { APP_CONFIG } from "@/core/config/app.config";
import { useSubscriptionCheck } from "@/shared/hooks/useSubscriptionCheck";
import { tokenStorage } from "@/shared/lib/storage";

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
        
        // Se usuário estiver logado, verificar assinatura
        if (isAuthenticated) {
          await refetch();
          
          if (isActive) {
            setProcessingStatus('success');
            // Auto-redirect após 2 segundos
            setTimeout(() => {
              navigate(APP_CONFIG.ROUTES.DASHBOARD);
            }, 2000);
          } else {
            setProcessingStatus('error');
          }
        } else {
          // Se não estiver logado, mostrar mensagem para fazer login
          setProcessingStatus('success');
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
                <p className="text-muted-foreground">
                  Faça login para acessar a plataforma.
                </p>
                <Button onClick={() => navigate(APP_CONFIG.ROUTES.LOGIN)} className="mt-4">
                  Fazer Login
                </Button>
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
          <Button onClick={() => navigate(APP_CONFIG.ROUTES.SUBSCRIPTION)}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCallback;
