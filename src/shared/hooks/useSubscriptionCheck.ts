import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getSubscriptionStatus, SubscriptionStatus } from "@/services/subscription.service";
import { useToast } from "@/hooks/use-toast";
import { tokenStorage, storage, userStorage } from "@/shared/lib/storage";
import { caktoService } from "@/services/cakto.service";

const SUBSCRIPTION_CACHE_KEY = 'subscription-status-cache';

interface SubscriptionCache {
  status: SubscriptionStatus;
  timestamp: number;
  date: string; // Data no formato YYYY-MM-DD para verificar se é do mesmo dia
}

// Verificar se é do mesmo dia
const isSameDay = (date1: string, date2: string): boolean => {
  return date1 === date2;
};

// Obter data atual no formato YYYY-MM-DD
const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const useSubscriptionCheck = (options?: { 
  redirectOnInactive?: boolean;
  checkInterval?: number; // em ms (padrão: 5 minutos)
  skipCheck?: boolean; // Pular verificação inicial (usar apenas cache)
  showModalOnInactive?: boolean; // Mostrar modal ao invés de redirecionar
}) => {
  const { redirectOnInactive = true, checkInterval = 5 * 60 * 1000, skipCheck = false, showModalOnInactive = false } = options || {}; // Padrão: 5 minutos
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const isCheckingRef = useRef(false);
  const lastCheckRef = useRef<number>(0);
  const CHECK_DEBOUNCE_MS = 1000; // Evitar chamadas duplicadas em menos de 1 segundo

  // Verificar se está navegando dentro do dashboard
  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  // Carregar status do cache
  const loadCachedStatus = useCallback((): SubscriptionStatus | null => {
    try {
      const cached = storage.get<SubscriptionCache>(SUBSCRIPTION_CACHE_KEY);
      if (cached && cached.status) {
        const currentDate = getCurrentDate();
        const cachedDate = cached.date || new Date(cached.timestamp).toISOString().split('T')[0];
        
        // Se é do mesmo dia e o status está ativo, usar cache
        if (isSameDay(currentDate, cachedDate) && cached.status.is_active) {
          return cached.status;
        }
        
        // Se não é do mesmo dia ou status não está ativo, cache inválido
        return null;
      }
    } catch {
      // Ignorar erros de cache
    }
    return null;
  }, []);

  // Salvar status no cache
  const saveCachedStatus = useCallback((status: SubscriptionStatus) => {
    try {
      storage.set(SUBSCRIPTION_CACHE_KEY, {
        status,
        timestamp: Date.now(),
        date: getCurrentDate(),
      });
    } catch {
      // Ignorar erros de cache
    }
  }, []);

  const checkStatus = useCallback(async (force = false) => {
    // Evitar chamadas duplicadas simultâneas
    if (isCheckingRef.current) {
      return;
    }

    // Evitar chamadas muito próximas (debounce)
    const now = Date.now();
    if (!force && now - lastCheckRef.current < CHECK_DEBOUNCE_MS) {
      return;
    }

    const token = tokenStorage.get();
    if (!token) {
      setLoading(false);
      return;
    }

    // Se está navegando dentro do dashboard e não é forçado, tentar usar cache primeiro
    if (isDashboardRoute && !force) {
      const cachedStatus = loadCachedStatus();
      if (cachedStatus) {
        setStatus(cachedStatus);
        setLoading(false);
        // Não redirecionar se estiver usando cache - apenas se status mudou
        return;
      }
    }

    try {
      isCheckingRef.current = true;
      lastCheckRef.current = now;
      setLoading(true);
      setError(null);
      const subscriptionStatus = await getSubscriptionStatus();
      setStatus(subscriptionStatus);
      saveCachedStatus(subscriptionStatus); // Salvar no cache

      if (!subscriptionStatus.is_active && redirectOnInactive) {
        if (showModalOnInactive) {
          // Mostrar modal ao invés de redirecionar
          setShowPlanModal(true);
        } else {
          // Redirecionar direto para Cakto ao invés de página de assinatura
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
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao verificar assinatura";
      setError(errorMessage);
      
      // Se for erro 403, redirecionar para assinatura
      if (err instanceof Error && errorMessage.includes("403")) {
        if (redirectOnInactive) {
          navigate("/assinatura");
        }
      }
    } finally {
      setLoading(false);
      isCheckingRef.current = false;
    }
  }, [navigate, toast, redirectOnInactive, isDashboardRoute, loadCachedStatus, saveCachedStatus]);

  useEffect(() => {
    // Se skipCheck estiver ativo, apenas carregar do cache
    if (skipCheck) {
      const cachedStatus = loadCachedStatus();
      if (cachedStatus) {
        setStatus(cachedStatus);
        setLoading(false);
        return;
      }
    }

    // Tentar carregar do cache primeiro
    const cachedStatus = loadCachedStatus();
    if (cachedStatus) {
      setStatus(cachedStatus);
      setLoading(false);
      // Se tem cache válido do mesmo dia e está ativo, não precisa verificar
      return;
    }

    // Se não há cache válido, fazer verificação
    if (!skipCheck) {
      checkStatus();
    }
    
    // Verificação diária: verificar uma vez por dia (na meia-noite)
    // Calcular tempo até a próxima meia-noite
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Timeout para verificar na meia-noite
    const midnightTimeout = setTimeout(() => {
      checkStatus(true);
    }, msUntilMidnight);
    
    // Depois da meia-noite, verificar a cada 24 horas
    const dailyInterval = setInterval(() => {
      checkStatus(true);
    }, 24 * 60 * 60 * 1000);
    
    return () => {
      clearTimeout(midnightTimeout);
      clearInterval(dailyInterval);
    };
  }, [checkStatus, skipCheck, loadCachedStatus]);

  return { 
    status, 
    loading, 
    error, 
    refetch: checkStatus,
    isActive: status?.is_active ?? false,
    showPlanModal,
    setShowPlanModal,
  };
};
