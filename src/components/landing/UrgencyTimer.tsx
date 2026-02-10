import { useState, useEffect } from "react";
import { Clock, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface UrgencyTimerProps {
  className?: string;
}

export const UrgencyTimer = ({ 
  className = "" 
}: UrgencyTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const hours = 4; // Sempre 4 horas

  useEffect(() => {
    // Usar localStorage para manter a contagem mesmo após refresh
    const getStoredEndTime = () => {
      const stored = localStorage.getItem('urgency_timer_end');
      if (stored) {
        const endTime = new Date(stored).getTime();
        const now = new Date().getTime();
        // Se ainda não expirou, usar o tempo armazenado
        if (endTime > now) {
          return endTime;
        }
      }
      // Se não há tempo armazenado ou expirou, criar novo
      const newEndTime = new Date();
      newEndTime.setHours(newEndTime.getHours() + hours);
      localStorage.setItem('urgency_timer_end', newEndTime.toISOString());
      return newEndTime.getTime();
    };

    const calculateTimeLeft = () => {
      const target = getStoredEndTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        // Resetar para 4h se expirou
        const newTarget = new Date();
        newTarget.setHours(newTarget.getHours() + hours);
        localStorage.setItem('urgency_timer_end', newTarget.toISOString());
        const newDiff = newTarget.getTime() - now;
        const newHours = Math.floor((newDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const newMinutes = Math.floor((newDiff % (1000 * 60 * 60)) / (1000 * 60));
        const newSeconds = Math.floor((newDiff % (1000 * 60)) / 1000);
        setTimeLeft({ hours: newHours, minutes: newMinutes, seconds: newSeconds });
        return;
      }

      const hoursLeft = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesLeft = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ hours: hoursLeft, minutes: minutesLeft, seconds: secondsLeft });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-destructive/20 via-destructive/15 to-destructive/20 border-2 border-destructive/40 shadow-lg shadow-destructive/20 ${className}`}
    >
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-destructive animate-pulse" />
        <Clock className="w-5 h-5 text-destructive" />
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
        <span className="text-base font-bold text-destructive dark:text-red-400">
          ⚡ Oferta expira em:
        </span>
        <span className="font-mono font-bold text-lg text-destructive dark:text-red-400 tracking-wider">
          {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
        </span>
      </div>
    </motion.div>
  );
};
