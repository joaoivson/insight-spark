/**
 * Application Routes
 * Configuração centralizada de rotas
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { tokenStorage } from "@/shared/lib/storage";

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
  if (!token) {
    return <Navigate to="/login" replace />;
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

