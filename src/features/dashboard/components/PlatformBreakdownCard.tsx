import { useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPlatformBreakdown } from "@/services/platform-breakdown.service";
import type { PlatformBreakdown, PlatformTotals } from "@/shared/types/platform-breakdown";
import { formatCurrency } from "@/shared/lib/chart-utils";
import { cn } from "@/shared/lib/utils";

const ROTULO_PLATAFORMA: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  messenger: "Messenger",
  audience_network: "Audience Network",
  threads: "Threads",
  desconhecido: "Outros",
};

const COR_PLATAFORMA: Record<string, string> = {
  instagram: "bg-pink-500",
  facebook: "bg-blue-500",
  messenger: "bg-sky-400",
  audience_network: "bg-violet-500",
  threads: "bg-zinc-400",
  desconhecido: "bg-muted-foreground",
};

const rotulo = (p: string) => ROTULO_PLATAFORMA[p] ?? p;
const percentual = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;

const LinhaPlataforma = ({ t }: { t: PlatformTotals }) => (
  <div className="space-y-1.5">
    <div className="flex items-baseline justify-between gap-2">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className={cn("h-2.5 w-2.5 rounded-full", COR_PLATAFORMA[t.platform] ?? "bg-muted-foreground")} />
        {rotulo(t.platform)}
      </span>
      <span className="text-sm text-muted-foreground">
        {formatCurrency(t.spend)} · {percentual(t.spend_share)}
      </span>
    </div>
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full", COR_PLATAFORMA[t.platform] ?? "bg-muted-foreground")}
        style={{ width: `${Math.min(100, Math.max(0, t.spend_share * 100))}%` }}
      />
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
      <span>{t.clicks.toLocaleString("pt-BR")} cliques</span>
      {t.cpc != null && <span>CPC {formatCurrency(t.cpc)}</span>}
      {t.roas != null && <span>ROAS {t.roas.toFixed(2).replace(".", ",")}x</span>}
      <span className={t.profit >= 0 ? "text-emerald-500" : "text-destructive"}>
        Lucro {formatCurrency(t.profit)}
      </span>
    </div>
  </div>
);

/**
 * Gasto e resultado por plataforma de veiculação (Instagram vs Facebook).
 *
 * A comissão por plataforma é RATEADA pelo gasto — a Shopee não informa de qual
 * placement veio o clique. O aviso no card existe pra isso não ser lido como
 * número auditável.
 */
export const PlatformBreakdownCard = ({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) => {
  const [data, setData] = useState<PlatformBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setErro(null);
    getPlatformBreakdown(startDate, endDate)
      .then((d) => {
        if (!cancelado) setData(d);
      })
      .catch((e: Error) => {
        if (!cancelado) setErro(e.message);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [startDate, endDate]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando veiculação por plataforma…
        </CardContent>
      </Card>
    );
  }

  if (erro) return null; // erro aqui não deve atrapalhar o resto da tela

  if (!data?.has_data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Onde seu anúncio está rodando</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Ainda não há dados de veiculação por plataforma. Eles aparecem depois da próxima
          sincronização com o Meta — a primeira carga traz até 90 dias de histórico.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          Onde seu anúncio está rodando
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Gasto e cliques vêm direto do Meta, separados por plataforma. A comissão é
                estimada: a Shopee não informa de qual plataforma veio o clique, então ela é
                distribuída na proporção do gasto de cada uma.
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.totals.map((t) => (
          <LinhaPlataforma key={t.platform} t={t} />
        ))}
        <p className="pt-1 text-xs text-muted-foreground">
          Gasto total no período: {formatCurrency(data.total_spend)}
        </p>
      </CardContent>
    </Card>
  );
};
