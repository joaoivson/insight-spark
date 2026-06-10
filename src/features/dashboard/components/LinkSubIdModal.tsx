import { useEffect, useMemo, useState } from "react";
import { Check, Lock, Search, Unlink } from "lucide-react";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { formatCurrency } from "@/shared/lib/chart-utils";
import { useToast } from "@/hooks/use-toast";
import { getSubIdOptions, linkCampaign } from "@/services/campaigns.service";
import type { Campaign, SubIdOption } from "@/shared/types/campaign";

/**
 * Modal de vínculo campanha → Sub ID por SELEÇÃO de lista (não texto livre).
 * Lista os Sub IDs com histórico de venda, sugere os de nome parecido, bloqueia
 * os já vinculados (1:1) e recalcula as métricas da campanha na hora.
 */
export const LinkSubIdModal = ({
  open,
  onOpenChange,
  campaign,
  range,
  onLinked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  range: { startDate: string; endDate: string };
  onLinked: (updated: Campaign) => void;
}) => {
  const { toast } = useToast();
  const [options, setOptions] = useState<SubIdOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setLoading(true);
    getSubIdOptions(campaign.id)
      .then((r) => setOptions(r.options))
      .catch((e) =>
        toast({ title: "Erro ao carregar Sub IDs", description: (e as Error).message, variant: "destructive" }),
      )
      .finally(() => setLoading(false));
  }, [open, campaign.id, toast]);

  const filtered = useMemo(() => {
    const list = options ?? [];
    const t = search.trim().toLowerCase();
    return t ? list.filter((o) => o.sub_id.toLowerCase().includes(t)) : list;
  }, [options, search]);

  const apply = async (subId: string | null) => {
    setBusy(true);
    try {
      const updated = await linkCampaign(campaign.id, subId, range);
      toast({ title: subId ? "Campanha vinculada" : "Vínculo removido" });
      onLinked(updated);
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Não foi possível vincular", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title={`Vincular Sub ID · ${campaign.name}`}>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar Sub ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-[48vh] space-y-1.5 overflow-y-auto pr-1">
          {loading ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {options && options.length > 0 ? "Nenhum Sub ID encontrado." : "Nenhum Sub ID com venda ainda."}
            </p>
          ) : (
            filtered.map((o) => {
              const isCurrent = campaign.sub_id === o.sub_id;
              const lockedTo = o.linked_campaign_id != null;
              return (
                <button
                  key={o.sub_id}
                  type="button"
                  disabled={lockedTo || busy}
                  onClick={() => apply(o.sub_id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    isCurrent ? "border-primary/50 bg-primary/5" : "border-border hover:bg-accent/40",
                    lockedTo && "cursor-not-allowed opacity-60 hover:bg-transparent",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{o.sub_id}</span>
                      {o.suggested && !lockedTo && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          sugerido
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {lockedTo ? (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3 w-3" /> vinculado a “{o.linked_campaign_name}”
                        </span>
                      ) : (
                        `${o.orders} ${o.orders === 1 ? "pedido" : "pedidos"} · ${formatCurrency(o.commission)}`
                      )}
                    </span>
                  </span>
                  {isCurrent && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
                </button>
              );
            })
          )}
        </div>

        {campaign.linked && (
          <Button
            variant="outline"
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={busy}
            onClick={() => apply(null)}
          >
            <Unlink className="mr-1.5 h-4 w-4" /> Desvincular
          </Button>
        )}
      </div>
    </ResponsiveModal>
  );
};
