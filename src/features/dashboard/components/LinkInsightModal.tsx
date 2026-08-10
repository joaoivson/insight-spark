import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateOnly as formatDate, formatDateTime as formatLastClick } from "@/shared/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getLinkInsight, type LinkInsight } from "@/services/custom_link.service";

const BAR_COLOR = "#318CE9";

type Granularity = "day" | "month";

interface LinkInsightModalProps {
  link: { id: number; title?: string; slug: string } | null;
  onClose: () => void;
}

/** Formata número inteiro/decimal curto em pt-BR. */
function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 10) / 10;
  return rounded.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

interface KpiProps {
  label: string;
  value: string;
}

const Kpi = ({ label, value }: KpiProps) => (
  <div className="rounded-lg border border-border bg-secondary/40 px-3 py-3">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-semibold">{label}</div>
      <div className="flex justify-between gap-6">
        <span className="text-muted-foreground">Cliques</span>
        <span className="tabular-nums">{formatNumber(Number(payload[0]?.value ?? 0))}</span>
      </div>
    </div>
  );
}

export default function LinkInsightModal({ link, onClose }: LinkInsightModalProps) {
  const { toast } = useToast();
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [insight, setInsight] = useState<LinkInsight | null>(null);
  const [loading, setLoading] = useState(false);

  const title = link ? link.title || link.slug : "";

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  // Reseta a granularidade ao abrir um link novo, para começar sempre em "Dia".
  useEffect(() => {
    if (link) setGranularity("day");
  }, [link?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!link) {
      setInsight(null);
      return;
    }
    let active = true;
    setLoading(true);
    getLinkInsight(link.id, granularity)
      .then((data) => {
        if (active) setInsight(data);
      })
      .catch((err) => {
        if (!active) return;
        setInsight(null);
        toast({
          variant: "destructive",
          title: "Erro ao carregar insight",
          description: err instanceof Error ? err.message : "Tente novamente.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [link?.id, granularity, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  const series = insight?.series ?? [];
  const hasData = series.length > 0;
  const startedAt = formatDate(insight?.series_started_at ?? null);

  return (
    <ResponsiveModal open={!!link} onOpenChange={handleOpenChange} title={title}>
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          {loading || !insight ? (
            <>
              <Skeleton className="h-[68px] rounded-lg" />
              <Skeleton className="h-[68px] rounded-lg" />
              <Skeleton className="h-[68px] rounded-lg" />
            </>
          ) : (
            <>
              <Kpi label="Total de cliques" value={formatNumber(insight.total_clicks)} />
              <Kpi label="Último clique" value={formatLastClick(insight.last_click_at)} />
              <Kpi label="Média/dia" value={formatNumber(insight.avg_per_day)} />
            </>
          )}
        </div>

        {/* Toggle Dia | Mês */}
        <div className="flex justify-end">
          <div className="flex gap-1 rounded-lg border border-border bg-secondary/40 p-1 text-xs">
            {(["day", "month"] as Granularity[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  granularity === g
                    ? "border border-[rgba(49,140,233,0.38)] bg-[rgba(49,140,233,0.12)] font-medium text-[#7CB8F2]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {g === "day" ? "Dia" : "Mês"}
              </button>
            ))}
          </div>
        </div>

        {/* Chart / estados */}
        <div className="min-h-[240px]">
          {loading ? (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          ) : hasData ? (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 4"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#8A93A3" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#8A93A3" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="value" fill={BAR_COLOR} radius={[3, 3, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 text-center">
              <p className="text-sm text-muted-foreground">
                Ainda não há cliques neste período. O gráfico começa a popular a partir de agora.
              </p>
              {startedAt && (
                <p className="text-xs text-muted-foreground/80">dados desde {startedAt}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </ResponsiveModal>
  );
}
