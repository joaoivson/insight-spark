import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchUsage } from "@/services/admin-panel.service";

export default function AdminUsagePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsage()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, []);

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

  const logins = (data.logins_per_day || []).map((r: any) => ({
    date: r.date,
    count: r.count,
  }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {data.note ||
          "Chamadas API/dia: proxy por erros/atividade de sync (não é APM completo)."}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logins por dia (30d)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={logins}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Telas mais acessadas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(data.top_pages || []).map((p: any) => (
                <li key={p.path} className="flex justify-between gap-4 border-b border-border/40 py-1">
                  <code className="truncate text-xs">{p.path}</code>
                  <span className="tabular-nums text-muted-foreground">{p.count}</span>
                </li>
              ))}
              {(data.top_pages || []).length === 0 && (
                <li className="text-muted-foreground">Sem page views ainda</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Syncs / erros por fonte (proxy de chamadas API)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            {(data.sync_activity_proxy || []).slice(0, 30).map((r: any, i: number) => (
              <span key={`${r.source}-${r.date}-${i}`} className="rounded border px-2 py-1 text-xs">
                {r.source} {r.date}: {r.count}
              </span>
            ))}
            {(data.sync_activity_proxy || []).length === 0 && (
              <span className="text-muted-foreground text-sm">Sem atividade de erro registrada</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Erros de sync (últimos)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.sync_errors || []).map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {e.created_at ? new Date(e.created_at).toLocaleString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>{e.user_id ?? "—"}</TableCell>
                  <TableCell>{e.source}</TableCell>
                  <TableCell className="max-w-md truncate text-xs">{e.error_message}</TableCell>
                </TableRow>
              ))}
              {(data.sync_errors || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum erro recente
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
