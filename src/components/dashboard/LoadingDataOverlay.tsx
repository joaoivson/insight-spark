import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, TrendingUp, Target, BarChart3, Rocket } from "lucide-react";
import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";

const MESSAGES = [
  "Preparando seus insights de performance...",
  "Conectando com seus dados da Shopee...",
  "Quase lá! Estamos organizando seus lucros...",
  "Transformando dados em estratégias de escala...",
  "Pronto para descobrir o que realmente funciona?",
];

const ICONS = [Sparkles, TrendingUp, Target, BarChart3, Rocket];

interface LoadingDataOverlayProps {
  datasetId?: number | string | null;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

export const LoadingDataOverlay = ({ datasetId, onComplete, onError }: LoadingDataOverlayProps) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [pollingAttempt, setPollingAttempt] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Polling Effect
  useEffect(() => {
    if (!datasetId) {
      console.warn('[LoadingDataOverlay] No datasetId provided, skipping polling');
      return;
    }

    console.log('[LoadingDataOverlay] Starting polling for datasetId:', datasetId);
    let isActive = true;

    const checkStatus = async () => {
      try {
        console.log('[LoadingDataOverlay] Polling attempt', pollingAttempt, 'for dataset:', datasetId);
        const response = await fetchWithAuth(getApiUrl(`/api/v1/datasets/${datasetId}/status`));

        if (!response.ok) {
          // Se der 404 ou 500, continuamos tentando por um tempo (poderia ser delay de propagação), 
          // mas aqui vamos assumir erro fatal se for persistente ou se o backend retornar erro explícito.
          // Por enquanto, apenas logamos e tentamos novamente.
          console.warn("[LoadingDataOverlay] Status check failed", response.status);
        } else {
          const data = await response.json();
          console.log('[LoadingDataOverlay] Received status data:', data);
          // datasetId do backend pode ser string ou number, comparamos de forma segura se necessário,
          // mas aqui confiamos no endpoint.

          if (data.status === 'completed') {
            console.log('[LoadingDataOverlay] Dataset completed! Calling onComplete');
            if (isActive && onComplete) onComplete(data);
            return; // Stop polling
          } else if (data.status === 'error') {
            console.error('[LoadingDataOverlay] Dataset error:', data.error_message);
            if (isActive && onError) onError(data.error_message || "Erro no processamento do arquivo.");
            return; // Stop polling
          }
          // Se 'pending', continuamos.
        }
      } catch (err) {
        console.error("Polling error:", err);
      }

      // Schedule next poll
      if (isActive) {
        timeoutRef.current = setTimeout(() => {
          setPollingAttempt(prev => prev + 1);
        }, 2000); // 2 seconds interval
      }
    };

    checkStatus();

    return () => {
      isActive = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [datasetId, pollingAttempt, onComplete, onError]);

  const Icon = ICONS[messageIndex % ICONS.length];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
    >
      <div className="max-w-md w-full px-6 text-center space-y-8">
        <div className="relative">
          {/* Outer glow effect */}
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />

          <div className="relative flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent p-0.5 shadow-2xl shadow-primary/20 animate-bounce">
              <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">
                Processando Inteligência
              </h2>

              <div className="h-16 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={messageIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <Icon className="w-5 h-5 text-primary" />
                    <p className="text-lg leading-relaxed">
                      {MESSAGES[messageIndex]}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar simulation (infinite) */}
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-medium">
          Isso pode levar alguns minutos...
        </p>
      </div>
    </motion.div>
  );
};
