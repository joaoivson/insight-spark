import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  centsToBRL,
  fetchDre,
  type DreResponse,
} from "@/services/admin-panel.service";
import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import { useAdminPanelStore } from "@/stores/adminPanelStore";
import { cn } from "@/shared/lib/utils";

function LineRow({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between border-b border-border/50 py-2 ${
        strong ? "font-semibold" : ""
      } ${muted ? "text-muted-foreground text-sm" : ""}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export default function AdminDrePage() {
  const { year, month, setPeriod } = useAdminPanelStore();
  const [data, setData] = useState<DreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchDre(year, month)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, [year, month]);

  const exportCsv = async () => {
    const res = await fetchWithAuth(
      getApiUrl(`/api/v1/admin/dre/export.csv?year=${year}&month=${month}`),
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dre_${year}_${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-destructive">{error || "Sem dados"}</p>;
  }

  // Meses com movimento (receita ou despesa ≠ 0), mais recente primeiro.
  const availableMonths = [...(data.series || [])]
    .filter(
      (m) =>
        (m.revenue_net_cents || 0) !== 0 || (m.expenses_total_cents || 0) !== 0,
    )
    .reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">DRE gerencial</h2>
            <Badge variant="outline" className="text-[10px] font-normal">
              não substitui contabilidade
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void exportCsv()}>
          <Download className="mr-1.5 h-4 w-4" />
          CSV
        </Button>
      </div>

          {!data.has_expenses && (
        <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Lance despesas para fechar o resultado —{" "}
          <Link to="/admin/despesas" className="underline">
            ir para Despesas
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Meses</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-0.5 p-2">
            {availableMonths.map((m) => {
              const [y, mo] = m.month.split("-").map(Number);
              const active = y === year && mo === month;
              return (
                <button
                  key={m.month}
                  onClick={() => setPeriod(y, mo)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                    active
                      ? "border-l-2 font-medium"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                  style={
                    active
                      ? {
                          background: "rgba(49,140,233,.12)",
                          borderColor: "rgba(49,140,233,.38)",
                          color: "#7CB8F2",
                        }
                      : undefined
                  }
                >
                  {m.month}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Resultado {String(month).padStart(2, "0")}/{year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineRow label="(+) Receita bruta" value={centsToBRL(data.gross_cents)} />
            <LineRow
              label="(−) Estornos"
              value={centsToBRL(data.refund_gross_cents)}
              muted
            />
            <LineRow
              label="(=) Receita bruta líquida de estorno"
              value={centsToBRL(data.gross_after_refund_cents)}
            />
            <LineRow label="(−) Taxas Kiwify" value={centsToBRL(data.fees_cents)} muted />
            <LineRow
              label="(=) Receita líquida (caixa)"
              value={centsToBRL(data.revenue_net_cents)}
              strong
            />
            {(data.expenses_by_category || []).map((c) => (
              <LineRow
                key={c.category}
                label={`(−) ${c.category}`}
                value={centsToBRL(c.amount_cents)}
                muted
              />
            ))}
            <LineRow
              label="(−) Despesas totais"
              value={centsToBRL(data.expenses_total_cents)}
            />
            <LineRow
              label="(=) Resultado do mês"
              value={centsToBRL(data.result_cents)}
              strong
            />
            <LineRow
              label="Margem %"
              value={
                data.margin == null ? "—" : `${(data.margin * 100).toFixed(1)}%`
              }
            />
            {data.mom && (
              <LineRow
                label="vs mês anterior"
                value={centsToBRL(data.mom.delta_cents)}
                muted
              />
            )}
            {data.burn_avg_3m_cents != null && (
              <p className="mt-4 text-xs text-amber-700 dark:text-amber-400">
                Burn médio 3m: {centsToBRL(data.burn_avg_3m_cents)} — sem saldo de caixa
                cadastrado
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
