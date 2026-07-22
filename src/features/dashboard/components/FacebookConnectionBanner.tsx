import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Link2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type FacebookConnectionState = "conectado" | "nunca" | "desconectado";

type Props = {
  state: FacebookConnectionState | null | undefined;
  className?: string;
};

/** Banner de conexão Facebook (Campanhas / Dashboard). */
export function FacebookConnectionBanner({ state, className }: Props) {
  const navigate = useNavigate();
  if (!state || state === "conectado") return null;

  const never = state === "nunca";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p>
          {never
            ? "Nenhuma conta de anúncio conectada. Conecte sua conta do Facebook para acompanhar gasto e controlar campanhas."
            : "Sua conta do Facebook foi desconectada. Os dados abaixo são históricos e não estão sendo atualizados."}
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0"
        onClick={() => navigate("/dashboard/configuracoes?tab=facebook")}
      >
        <Link2 className="mr-1.5 h-3.5 w-3.5" />
        {never ? "Conectar conta" : "Reconectar"}
      </Button>
    </div>
  );
}
