/**
 * Application Routes
 * Configuração centralizada de rotas
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { tokenStorage } from "@/shared/lib/storage";

// Lazy loading para melhor performance
const Index = lazy(() => import("@/features/landing/pages/Index"));
const Login = lazy(() => import("@/features/auth/pages/Login"));
const Signup = lazy(() => import("@/features/auth/pages/Signup"));
const Dashboard = lazy(() => import("@/features/dashboard/pages/Dashboard"));
const UploadCSV = lazy(() => import("@/features/dashboard/pages/UploadCSV"));
const Reports = lazy(() => import("@/features/dashboard/pages/Reports"));
const Modules = lazy(() => import("@/features/dashboard/pages/Modules"));
const Settings = lazy(() => import("@/features/dashboard/pages/Settings"));
const NotFound = lazy(() => import("@/shared/pages/NotFound"));

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
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
        <Route path="/dashboard/upload" element={<ProtectedRoute element={<UploadCSV />} />} />
        <Route path="/dashboard/reports" element={<ProtectedRoute element={<Reports />} />} />
        <Route path="/dashboard/modules" element={<ProtectedRoute element={<Modules />} />} />
        <Route path="/dashboard/settings" element={<ProtectedRoute element={<Settings />} />} />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

