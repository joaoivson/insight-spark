import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SyncRun } from "@/services/admin-panel.service";

/**
 * Mensagem de erro truncada com "…" e sem poder abrir é informação pela metade.
 * O erro da Shopee chega como JSON dentro da string — formatar indentado é o que
 * torna legível.
 */
function formatarMensagem(msg: string): string {
  const inicio = msg.search(/[[{]/);
  if (inicio === -1) return msg;
  const prefixo = msg.slice(0, inicio);
  const corpo = msg.slice(inicio);
  // a API devolve dict Python (aspas simples / True / None) — normaliza pra JSON
  const candidato = corpo
    .replace(/'/g, '"')
    .replace(/\bNone\b/g, "null")
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false");
  try {
    return prefixo + JSON.stringify(JSON.parse(candidato), null, 2);
  } catch {
    return msg;
  }
}

export function SyncErrorDialog({
  run,
  onOpenChange,
}: {
  run: SyncRun | null;
  onOpenChange: (aberto: boolean) => void;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!run?.error_message) return;
    try {
      await navigator.clipboard.writeText(run.error_message);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard bloqueado — ignora */
    }
  };

  return (
    <Dialog open={!!run} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhe do erro</DialogTitle>
        </DialogHeader>
        {run && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Quando</dt>
                <dd>
                  {run.started_at
                    ? new Date(run.started_at).toLocaleString("pt-BR")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Fonte</dt>
                <dd className="capitalize">{run.source}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Usuária</dt>
                <dd className="truncate">
                  {run.usuario ? run.usuario.nome : run.user_id ? `#${run.user_id}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Motivo</dt>
                <dd>
                  {run.erro_motivo ? (
                    <Badge variant="outline">
                      {run.erro_motivo}
                      {run.erro_codigo ? ` · ${run.erro_codigo}` : ""}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Mensagem completa</span>
                <Button size="sm" variant="outline" onClick={copiar}>
                  {copiado ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
                    </>
                  )}
                </Button>
              </div>
              <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
                {run.error_message ? formatarMensagem(run.error_message) : "—"}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
