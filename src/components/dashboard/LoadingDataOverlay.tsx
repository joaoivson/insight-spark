import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, TrendingUp, Target, BarChart3, Rocket } from "lucide-react";

const MESSAGES = [
  "Preparando seus insights de performance...",
  "Conectando com seus dados da Shopee...",
  "Quase lá! Estamos organizando seus lucros...",
  "Transformando dados em estratégias de escala...",
  "Pronto para descobrir o que realmente funciona?",
];

const ICONS = [Sparkles, TrendingUp, Target, BarChart3, Rocket];

export const LoadingDataOverlay = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
                Carregando sua Inteligência
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

        {/* Progress bar simulation */}
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 15, ease: "linear" }}
          />
        </div>

        <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-medium">
          MarketDash • Performance Analytics
        </p>
      </div>
    </motion.div>
  );
};
