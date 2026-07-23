import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  const { year, month } = useAdminPanelStore();
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

  const series = (data.series || []).map((r) => ({
    month: r.month,
    receita: (r.revenue_net_cents || 0) / 100,
    despesas: (r.expenses_total_cents || 0) / 100,
    resultado: (r.result_cents || 0) / 100,
  }));

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
          {data.mom && (
            <p className="mt-1 text-sm text-muted-foreground">
              MoM resultado: {centsToBRL(data.mom.delta_cents)}
              {data.mom.delta_pct != null
                ? ` (${(data.mom.delta_pct * 100).toFixed(1)}%)`
                : ""}
            </p>
          )}
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

      <div className="grid gap-4 lg:grid-cols-2">
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
            {data.burn_avg_3m_cents != null && (
              <p className="mt-4 text-xs text-amber-700 dark:text-amber-400">
                Burn médio 3m: {centsToBRL(data.burn_avg_3m_cents)} — sem saldo de caixa
                cadastrado
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Série 12 meses</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => centsToBRL(Math.round(v * 100))} />
                <Legend />
                <Bar dataKey="receita" name="Receita líquida" fill="hsl(var(--primary))" stackId="a" />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--muted-foreground))" stackId="b" />
                <Bar dataKey="resultado" name="Resultado" fill="hsl(142 70% 40%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
