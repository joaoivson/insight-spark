import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { cn } from "@/shared/lib/utils";

export const SYNC_DAY_OPTIONS = [7, 14, 30, 60, 90] as const;
export type SyncDaysOption = (typeof SYNC_DAY_OPTIONS)[number];

interface SyncDaysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (days: SyncDaysOption) => void;
  loading?: boolean;
}

export const SyncDaysDialog = ({ open, onOpenChange, onConfirm, loading }: SyncDaysDialogProps) => {
  const [selectedDays, setSelectedDays] = useState<SyncDaysOption>(7);

  const handleConfirm = () => {
    onConfirm(selectedDays);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Sincronizar comissões Shopee"
      description="Escolha quantos dias de histórico deseja buscar na API da Shopee."
      contentClassName="sm:max-w-md"
    >
      <div className="space-y-5 pb-2">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {SYNC_DAY_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setSelectedDays(days)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                selectedDays === days
                  ? "border-orange-500 bg-orange-500/10 text-orange-500"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {days} dias
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Sincronizações maiores podem levar alguns minutos. Você pode acompanhar o progresso na tela seguinte.
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading} className="gap-2">
            {loading ? "Iniciando…" : `Sincronizar ${selectedDays} dias`}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
};
