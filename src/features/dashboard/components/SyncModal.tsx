import { motion, AnimatePresence } from "framer-motion";
import { Check, RefreshCw, Database, LayoutDashboard } from "lucide-react";

type Step = "syncing" | "saving" | "refreshing" | "done";

const STEPS: { key: Step; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    key: "syncing",
    label: "Conectando à API Shopee",
    sub: "Buscando comissões dos últimos 90 dias...",
    icon: <RefreshCw className="w-5 h-5" />,
  },
  {
    key: "saving",
    label: "Salvando no banco de dados",
    sub: "Inserindo novas comissões...",
    icon: <Database className="w-5 h-5" />,
  },
  {
    key: "refreshing",
    label: "Atualizando dashboard",
    sub: "Recarregando dados do painel...",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    key: "done",
    label: "Sincronização concluída",
    sub: "Seus dados estão atualizados.",
    icon: <Check className="w-5 h-5" />,
  },
];

const stepIndex = (step: Step) => STEPS.findIndex((s) => s.key === step);

interface SyncModalProps {
  open: boolean;
  step: Step;
}

export const SyncModal = ({ open, step }: SyncModalProps) => {
  const current = stepIndex(step);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sync-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            key="sync-modal"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6 md:p-8 overflow-hidden"
          >
            {/* Glow de fundo animado */}
            <motion.div
              className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-orange-500/20 blur-3xl pointer-events-none"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Logo Shopee + título */}
            <div className="flex items-center gap-3 mb-8">
              <motion.div
                className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0"
                animate={step !== "done" ? { rotate: [0, 360] } : { rotate: 0 }}
                transition={{ duration: 2, repeat: step !== "done" ? Infinity : 0, ease: "linear" }}
              >
                <span className="text-lg font-bold text-orange-500">S</span>
              </motion.div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Shopee Afiliados</p>
                <p className="text-sm font-semibold text-foreground">Sincronização em andamento</p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {STEPS.map((s, i) => {
                const isDone = i < current || step === "done";
                const isActive = i === current && step !== "done";

                return (
                  <motion.div
                    key={s.key}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: i <= current ? 1 : 0.3, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    className="flex items-center gap-4"
                  >
                    {/* Ícone do step */}
                    <div className="relative flex-shrink-0">
                      <motion.div
                        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                          step === "done" || isDone
                            ? "bg-orange-500 border-orange-500 text-white"
                            : isActive
                            ? "bg-orange-500/10 border-orange-500 text-orange-500"
                            : "bg-muted border-border text-muted-foreground"
                        }`}
                        animate={isActive ? { boxShadow: ["0 0 0px #f97316", "0 0 12px #f97316", "0 0 0px #f97316"] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <AnimatePresence mode="wait">
                          {isDone || step === "done" ? (
                            <motion.span
                              key="check"
                              initial={{ scale: 0, rotate: -90 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0 }}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            >
                              <Check className="w-4 h-4" />
                            </motion.span>
                          ) : isActive ? (
                            <motion.span
                              key="spin"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                            >
                              {s.icon}
                            </motion.span>
                          ) : (
                            <motion.span key="idle">{s.icon}</motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>

                    {/* Texto */}
                    <div className="min-w-0">
                      <p className={`text-sm font-medium leading-tight ${i <= current ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </p>
                      <AnimatePresence>
                        {isActive && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-muted-foreground mt-0.5"
                          >
                            {s.sub}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Barra de progresso */}
            <div className="mt-8 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-orange-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{
                  width: step === "done" ? "100%" : `${((current) / (STEPS.length - 1)) * 100}%`,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
