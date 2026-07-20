import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDatasetStore } from "@/stores/datasetStore";
import { useClicksStore } from "@/stores/clicksStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Pencil, RefreshCw, Unplug, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SyncModal } from "./SyncModal";
import { SyncDaysDialog, SyncDaysOption } from "./SyncDaysDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  deleteShopeeCredentials,
  getShopeeStatus,
  saveShopeeCredentials,
  ShopeeStatus,
  triggerManualSync,
} from "@/services/shopee.service";

const schema = z.object({
  appId: z.string().trim().min(1, "AppID é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type FormData = z.infer<typeof schema>;

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const ShopeeIntegrationSettings = () => {
  const { toast } = useToast();
  const fetchRows = useDatasetStore((s) => s.fetchRows);
  const fetchClicks = useClicksStore((s) => s.fetchClicks);
  const [status, setStatus] = useState<ShopeeStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState<"syncing" | "saving" | "refreshing" | "done">("syncing");
  const [syncDays, setSyncDays] = useState<SyncDaysOption>(30);
  const [showSyncDaysDialog, setShowSyncDaysDialog] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    getShopeeStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoadingStatus(false));
  }, []);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const updated = await saveShopeeCredentials(data.appId, data.password);
      setStatus(updated);
      setIsEditing(false);
      toast({ title: "Credenciais salvas", description: "Integração Shopee configurada com sucesso." });
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async (days: SyncDaysOption) => {
    setShowSyncDaysDialog(false);
    setSyncDays(days);
    setIsSyncing(true);
    setSyncStep("syncing");
    const previousSyncAt = status?.last_sync_at ?? null;
    try {
      await triggerManualSync(days);
      setSyncStep("saving");

      // Polling: a cada 5s checa se last_sync_at mudou. Timeout 5 minutos.
      const POLL_INTERVAL_MS = 5_000;
      const MAX_POLL_MS = 5 * 60 * 1000;
      const startedAt = Date.now();
      let updated: ShopeeStatus | null = null;
      while (Date.now() - startedAt < MAX_POLL_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        try {
          const current = await getShopeeStatus();
          if (current?.last_sync_at && current.last_sync_at !== previousSyncAt) {
            updated = current;
            break;
          }
        } catch {
          // ignora falhas intermitentes do polling
        }
      }

      if (!updated) {
        toast({
          title: "Sincronização em andamento",
          description: "O processo está demorando mais que o esperado. Recarregue a página em alguns minutos.",
        });
        return;
      }

      setSyncStep("refreshing");
      await Promise.all([fetchRows({ force: true }), fetchClicks({ force: true })]);
      setSyncStep("done");
      setStatus(updated);
      await new Promise((r) => setTimeout(r, 800));
      toast({ title: "Sincronização concluída", description: "Dados Shopee atualizados com sucesso." });
    } catch (err) {
      toast({
        title: "Erro na sincronização",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await deleteShopeeCredentials();
      setStatus(null);
      toast({ title: "Desconectado", description: "Integração Shopee removida." });
    } catch (err) {
      toast({
        title: "Erro ao desconectar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setShowDisconnectDialog(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        {status?.is_active ? (
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
            Conectado
          </Badge>
        ) : (
          <Badge variant="secondary">Não conectado</Badge>
        )}
        {status?.last_sync_at && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Última sync: {formatDate(status.last_sync_at)}
          </span>
        )}
      </div>

      {/* Credentials: show form when not connected or editing */}
      <AnimatePresence initial={false}>
        {(!status?.is_active || isEditing) ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 overflow-hidden"
          >
            <div className="space-y-2">
              <Label htmlFor="appId">AppID</Label>
              <Input
                id="appId"
                placeholder="Ex: 1234567890"
                defaultValue={status?.app_id ?? ""}
                {...register("appId")}
                className="bg-background"
              />
              {errors.appId && (
                <p className="text-sm text-destructive">{errors.appId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha / Secret</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha da API Shopee"
                  {...register("password")}
                  className="bg-background pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="gap-1.5 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              )}
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="credentials-summary"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">AppID</p>
                <p className="text-sm font-mono font-medium text-foreground truncate">{status.app_id}</p>
              </div>
              <div className="space-y-0.5 flex-1 min-w-0 sm:mx-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Senha / Secret</p>
                <p className="text-sm font-mono text-muted-foreground tracking-widest">••••••••••••</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5 w-full sm:w-auto flex-shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                Alterar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions when connected */}
      {status?.is_active && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setShowSyncDaysDialog(true)}
            disabled={isSyncing}
            className="gap-2 w-full sm:w-auto"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isSyncing ? "Sincronizando..." : "Sincronizar agora"}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowDisconnectDialog(true)}
            className="gap-2 w-full sm:w-auto text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Unplug className="w-4 h-4" />
            Desconectar
          </Button>
        </div>
      )}

      {/* Sync days picker + progress modal */}
      <SyncDaysDialog
        open={showSyncDaysDialog}
        onOpenChange={setShowSyncDaysDialog}
        onConfirm={handleSync}
        loading={isSyncing}
      />
      <SyncModal open={isSyncing} step={syncStep} days={syncDays} />

      {/* Disconnect confirmation dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar Shopee</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá as credenciais salvas e interromperá a sincronização automática.
              Os dados já sincronizados serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
