import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchSyncErrorReasons,
  type SyncErrorReason,
} from "@/services/admin-panel.service";

/**
 * "108 erros em 24h" sem motivo gera ansiedade sem direção.
 * Agrupado: 108× instabilidade Shopee = ignora; 50× credencial = ação nossa.
 */
export function SyncErrorReasons({
  onSelect,
  selecionado,
}: {
  onSelect: (motivo: string | null) => void;
  selecionado: string | null;
}) {
  const [dados, setDados] = useState<SyncErrorReason[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSyncErrorReasons(24)
      .then(setDados)
      .catch(() => setDados([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!dados || dados.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Erros por motivo (24h)</CardTitle>
        {selecionado && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => onSelect(null)}
          >
            Limpar filtro
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {dados.map((r) => {
          const ativo = selecionado === r.motivo;
          return (
            <button
              key={r.motivo}
              type="button"
              onClick={() => onSelect(ativo ? null : r.motivo)}
              className="block w-full text-left"
            >
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className={ativo ? "font-medium" : undefined}>
                  {r.motivo}
                  {r.codigo && (
                    <code className="ml-1.5 text-xs text-muted-foreground">[{r.codigo}]</code>
                  )}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {r.total} · {r.usuarios === 1 ? "1 conta" : `${r.usuarios} contas`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${ativo ? "bg-destructive" : "bg-destructive/60"}`}
                  style={{ width: `${Math.max(r.proporcao * 100, 2)}%` }}
                />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
