import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { getJobStatus, type JobStatusResponse } from "@/services/jobs.service";

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

interface JobProgressOverlayProps {
  jobId: string;
  onComplete?: (data: JobStatusResponse) => void;
  onError?: (message: string) => void;
}

function formatErrors(errors: { chunk_index?: number; error: string }[]): string {
  if (!errors?.length) return "";
  return errors
    .map((e) => (e.chunk_index != null ? `Parte ${e.chunk_index + 1}: ${e.error}` : e.error))
    .join("; ");
}

export const JobProgressOverlay = ({ jobId, onComplete, onError }: JobProgressOverlayProps) => {
  const [status, setStatus] = useState<JobStatusResponse | null>(null);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pollRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!jobId) return;

    let isActive = true;
    startTimeRef.current = Date.now();

    const poll = async () => {
      if (!isActive) return;

      if (Date.now() - startTimeRef.current > TIMEOUT_MS) {
        onError?.("Processamento excedeu o tempo limite.");
        return;
      }

      try {
        const data = await getJobStatus(jobId);
        if (!isActive) return;

        setStatus(data);

        if (data.total_chunks != null && data.total_chunks > 0 && data.chunks_done != null) {
          setProgressPercent(Math.round((data.chunks_done / data.total_chunks) * 100));
        } else {
          setProgressPercent(null);
        }

        if (data.status === "completed") {
          onComplete?.(data);
          return;
        }

        if (data.status === "error") {
          const msg =
            data.error_message ||
            (data.errors?.length ? formatErrors(data.errors) : "Erro no processamento do arquivo.");
          onError?.(msg);
          return;
        }

        if (data.errors?.length) {
          onError?.(formatErrors(data.errors));
          return;
        }

        pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        if (isActive) {
          console.error("Job polling error:", err);
          onError?.(err instanceof Error ? err.message : "Falha ao consultar status.");
        }
      }
    };

    poll();

    return () => {
      isActive = false;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [jobId, onComplete, onError]);

  const totalChunks = status?.total_chunks ?? 0;
  const chunksDone = status?.chunks_done ?? 0;
  const showChunkProgress = totalChunks > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
    >
      <div className="max-w-md w-full px-6 text-center space-y-8">
        <div className="relative">
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
              <p className="text-lg text-muted-foreground">
                {showChunkProgress
                  ? `Processando… ${chunksDone} de ${totalChunks} partes`
                  : "Processando…"}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          {progressPercent != null ? (
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          ) : (
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>

        <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-medium">
          Isso pode levar alguns minutos...
        </p>
      </div>
    </motion.div>
  );
};
