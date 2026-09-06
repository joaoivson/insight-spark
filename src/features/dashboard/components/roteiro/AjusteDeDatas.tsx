import { useState } from "react";
import { AlertTriangle, CalendarClock, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PassoOut } from "@/services/roteiros.service";
import { cn } from "@/shared/lib/utils";

type Ajuste = { data_fixa: string; hora_fixa: string };

/**
 * Ajuste das datas fixas EM BLOCO.
 *
 * É o que torna duplicar barato: em vez de reagendar 22 mensagens, ela troca as
 * 4 ou 5 datas de hora fixa e todo o resto recalcula pelo offset. Abrir modal
 * por modal em 22 passos é onde o erro acontece — e o erro aqui agenda o
 * lançamento para uma data que já passou.
 *
 * Só passos de hora fixa aparecem: os relativos não têm data própria, e mostrar
 * um campo desabilitado para eles seria ruído.
 */
export const AjusteDeDatas = ({
  passos,
  salvando,
  onSalvar,
  onFechar,
}: {
  passos: PassoOut[];
  salvando: boolean;
  onSalvar: (
    datas: { passo_id: number; data_fixa: string; hora_fixa: string }[],
  ) => void;
  onFechar: () => void;
}) => {
  const ancoras = passos.filter((p) => p.tipo_tempo === "ancora");
  const [valores, setValores] = useState<Record<number, Ajuste>>(() =>
    Object.fromEntries(
      ancoras.map((p) => [
        p.id,
        { data_fixa: p.data_fixa ?? "", hora_fixa: p.hora_fixa ?? "" },
      ]),
    ),
  );

  const alterar = (id: number, patch: Partial<Ajuste>) =>
    setValores((atual) => ({ ...atual, [id]: { ...atual[id], ...patch } }));

  //  Só passo AJUSTÁVEL entra no payload — o travado já saiu e o backend
  //  recusa mexer nele. Contar `ancoras` no `disabled` deixava o botão ativo
  //  com todas travadas, e o PUT ia com a lista vazia (422 sem explicação).
  const ajustaveis = ancoras.filter((p) => !p.travado);
  const incompleto = ajustaveis.some(
    (p) => !valores[p.id]?.data_fixa || !valores[p.id]?.hora_fixa,
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <h2 className="mr-auto text-base font-semibold text-foreground">
          Datas do roteiro
        </h2>
        <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Fechar">
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[720px] space-y-3 p-4">
          {ancoras.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum passo com hora fixa neste roteiro.
            </p>
          ) : (
            ancoras.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex flex-wrap items-end gap-3 rounded-xl border p-3",
                  p.no_passado ? "border-destructive/50 bg-destructive/5" : "border-border",
                )}
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold tabular-nums text-primary">
                  {p.ordem}
                </span>
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <p className="truncate text-sm text-foreground">
                    {resumoCurto(p)}
                  </p>
                  {p.travado && (
                    <p className="text-xs text-muted-foreground">Já enviado</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor={`data-${p.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    Data
                  </Label>
                  <Input
                    id={`data-${p.id}`}
                    type="date"
                    className="w-40"
                    disabled={p.travado}
                    value={valores[p.id]?.data_fixa ?? ""}
                    onChange={(e) => alterar(p.id, { data_fixa: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor={`hora-${p.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    Horário
                  </Label>
                  <Input
                    id={`hora-${p.id}`}
                    type="time"
                    className="w-28"
                    disabled={p.travado}
                    value={valores[p.id]?.hora_fixa ?? ""}
                    onChange={(e) => alterar(p.id, { hora_fixa: e.target.value })}
                  />
                </div>
              </div>
            ))
          )}

          {incompleto && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              Todo passo de hora fixa precisa de data e horário.
            </p>
          )}
        </div>
      </div>

      <footer className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button variant="outline" onClick={onFechar} disabled={salvando}>
          Cancelar
        </Button>
        <Button
          disabled={salvando || incompleto || ajustaveis.length === 0}
          onClick={() =>
            onSalvar(
              ajustaveis
                .map((p) => ({
                  passo_id: p.id,
                  data_fixa: valores[p.id].data_fixa,
                  hora_fixa: valores[p.id].hora_fixa,
                })),
            )
          }
        >
          {salvando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CalendarClock className="mr-2 h-4 w-4" />
          )}
          Aplicar datas
        </Button>
      </footer>
    </div>
  );
};

const resumoCurto = (p: PassoOut) => {
  if (p.tipo_conteudo === "acao_grupo") return p.acao_parametro || "Ação no grupo";
  if (p.tipo_conteudo === "oferta") return p.oferta_url || "Oferta";
  const primeiro = p.blocos[0];
  if (!primeiro) return "Mensagem";
  return primeiro.tipo === "imagem"
    ? primeiro.legenda?.trim() || "Imagem"
    : primeiro.conteudo?.trim() || "Mensagem";
};
