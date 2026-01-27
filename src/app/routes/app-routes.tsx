/**
 * Application Routes
 * Configuração centralizada de rotas
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { tokenStorage } from "@/shared/lib/storage";
import { useSubscriptionCheck } from "@/shared/hooks/useSubscriptionCheck";
import { Loader2 } from "lucide-react";
import { SubscriptionPlanModal } from "@/features/subscription/components/SubscriptionPlanModal";

// Imports diretos para evitar falha de carregamento de chunks dinâmicos
import Index from "@/features/landing/pages/Index";
import Demo from "@/features/landing/pages/Demo";
import Login from "@/features/auth/pages/Login";
import Dashboard from "@/features/dashboard/pages/Dashboard";
import UploadCSV from "@/features/dashboard/pages/UploadCSV";
import Reports from "@/features/dashboard/pages/Reports";
import Modules from "@/features/dashboard/pages/Modules";
import Settings from "@/features/dashboard/pages/Settings";
import AdSpends from "@/features/dashboard/pages/AdSpends";
import SubscriptionPage from "@/features/subscription/pages/SubscriptionPage";
import SubscriptionSuccess from "@/features/subscription/pages/SubscriptionSuccess";
import SubscriptionError from "@/features/subscription/pages/SubscriptionError";
import SubscriptionCallback from "@/features/subscription/pages/SubscriptionCallback";
import SetPasswordPage from "@/features/auth/pages/SetPasswordPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import NotFound from "@/shared/pages/NotFound";

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
      <p className="mt-4 text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ element }: { element: JSX.Element }) => {
  const token = tokenStorage.get();
  // Usar skipCheck para rotas do dashboard após primeira validação
  // Isso evita verificações repetidas ao navegar entre páginas do dashboard
  const { status, loading, showPlanModal, setShowPlanModal } = useSubscriptionCheck({ 
    redirectOnInactive: true,
    skipCheck: false, // Primeira vez sempre verifica
    showModalOnInactive: true, // Mostrar modal ao invés de redirecionar
  });

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Verificando assinatura...</p>
        </div>
      </div>
    );
  }

  // Se assinatura inativa, mostrar modal ao invés de redirecionar
  if (status && !status.is_active) {
    // Garantir que o modal seja exibido quando a assinatura estiver inativa
    // Se showPlanModal ainda não foi definido, usar true como padrão
    const shouldShowModal = showPlanModal === undefined ? true : showPlanModal;
    
    return (
      <>
        <SubscriptionPlanModal
          open={shouldShowModal}
          onOpenChange={(open) => {
            setShowPlanModal(open);
            // Se o usuário fechar o modal, não fazer redirect automático
            // O modal pode ser reaberto se necessário
          }}
        />
        {/* Renderizar elemento com overlay escuro para indicar que precisa de assinatura */}
        <div className="opacity-50 pointer-events-none">
          {element}
        </div>
      </>
    );
  }

  return element;
};

export const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/login" element={<Login />} />
        
        {/* Auth Routes */}
        <Route path="/auth/set-password" element={<SetPasswordPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        
        {/* Subscription Routes */}
        <Route path="/assinatura" element={<SubscriptionPage />} />
        <Route path="/assinatura/callback" element={<SubscriptionCallback />} />
        <Route path="/assinatura/sucesso" element={<SubscriptionSuccess />} />
        <Route path="/assinatura/erro" element={<SubscriptionError />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
        <Route path="/dashboard/upload" element={<ProtectedRoute element={<UploadCSV />} />} />
        <Route path="/dashboard/reports" element={<ProtectedRoute element={<Reports />} />} />
        <Route path="/dashboard/modules" element={<ProtectedRoute element={<Modules />} />} />
        <Route path="/dashboard/settings" element={<ProtectedRoute element={<Settings />} />} />
        <Route path="/dashboard/investimentos" element={<ProtectedRoute element={<AdSpends />} />} />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

