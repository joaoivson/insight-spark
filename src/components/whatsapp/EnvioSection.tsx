import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Clock, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  obterConfigEnvio,
  salvarConfigEnvio,
  type JanelaDia,
} from "@/services/roteiros.service";
import { cn } from "@/shared/lib/utils";

// Índices do backend: "0"=segunda … "6"=domingo.
const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DIAS_LONGOS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

const PADRAO_INICIO = "08:00";
const PADRAO_FIM = "22:00";

type DiaForm = {
  ativo: boolean;
  inicio: string;
  fim: string;
  /** "" = sem pausa. */
  pausa_inicio: string;
  pausa_fim: string;
};

/** O backend serializa `time` como "HH:MM:SS" — a tela trabalha com "HH:MM". */
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");

const paraForm = (dia?: JanelaDia): DiaForm => ({
  ativo: dia?.ativo ?? true,
  inicio: hhmm(dia?.inicio) || PADRAO_INICIO,
  fim: hhmm(dia?.fim) || PADRAO_FIM,
  pausa_inicio: hhmm(dia?.pausa_inicio),
  pausa_fim: hhmm(dia?.pausa_fim),
});

export function EnvioSection() {
  const { toast } = useToast();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(true);
  const [dias, setDias] = useState<DiaForm[]>([]);
  const [pausaAberta, setPausaAberta] = useState<Set<number>>(new Set());
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const config = await obterConfigEnvio();
      setAtivo(config.ativo);
      const lista = Array.from({ length: 7 }, (_, i) => paraForm(config.dias?.[String(i)]));
      setDias(lista);
      setPausaAberta(
        new Set(
          lista.flatMap((d, i) => (d.pausa_inicio || d.pausa_fim ? [i] : [])),
        ),
      );
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const atualizarDia = (indice: number, patch: Partial<DiaForm>) => {
    setDias((atual) => atual.map((d, i) => (i === indice ? { ...d, ...patch } : d)));
  };

  const alternarPausa = (indice: number) => {
    setPausaAberta((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(indice)) proximo.delete(indice);
      else proximo.add(indice);
      return proximo;
    });
  };

  // "HH:MM" compara certo como string. O backend valida fim > início em TODOS
  // os dias (ativos ou não) — a validação aqui cobre o mesmo conjunto.
  const validar = (): string | null => {
    for (let i = 0; i < dias.length; i++) {
      const d = dias[i];
      if (d.fim <= d.inicio) {
        return `${DIAS_LONGOS[i]}: o fim precisa ser depois do início.`;
      }
      if (d.pausa_inicio || d.pausa_fim) {
        if (!d.pausa_inicio || !d.pausa_fim) {
          return `${DIAS_LONGOS[i]}: informe início e fim da pausa.`;
        }
        if (d.pausa_fim <= d.pausa_inicio) {
          return `${DIAS_LONGOS[i]}: o fim da pausa precisa ser depois do início.`;
        }
      }
    }
    return null;
  };

  const salvar = async () => {
    const mensagem = validar();
    if (mensagem) {
      toast({ title: "Janela inválida", description: mensagem, variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      await salvarConfigEnvio({
        ativo,
        dias: Object.fromEntries(
          dias.map((d, i) => [
            String(i),
            {
              ativo: d.ativo,
              inicio: d.inicio,
              fim: d.fim,
              pausa_inicio: d.pausa_inicio || null,
              pausa_fim: d.pausa_fim || null,
            },
          ]),
        ),
      });
      toast({ title: "Janela de envio salva" });
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
      <div className="flex items-start gap-3 md:gap-4 mb-5">
        <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <Clock className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">Envio</h3>
          <p className="text-sm text-muted-foreground">
            Fora da janela, os envios pausam e retomam sozinhos na próxima abertura.
          </p>
        </div>
      </div>

      {carregando ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-xl" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : erro ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">{erro}</p>
          <Button variant="outline" onClick={() => void carregar()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
            <Label htmlFor="restringir-horario" className="text-sm font-medium">
              Restringir horário de envio
            </Label>
            <Switch id="restringir-horario" checked={ativo} onCheckedChange={setAtivo} />
          </div>

          <div className={cn("space-y-3", !ativo && "pointer-events-none opacity-50")}>
            {dias.map((d, i) => {
              const pausaDefinida = Boolean(d.pausa_inicio && d.pausa_fim);
              const aberta = pausaAberta.has(i);
              const janelaInvalida = d.fim <= d.inicio;
              return (
                <div key={i} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <label className="flex w-20 flex-shrink-0 items-center gap-2">
                      <Switch
                        checked={d.ativo}
                        disabled={!ativo}
                        onCheckedChange={(v) => atualizarDia(i, { ativo: v })}
                        aria-label={`${DIAS_LONGOS[i]} com envio`}
                      />
                      <span className="text-sm font-medium text-foreground">{DIAS_CURTOS[i]}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={d.inicio}
                        disabled={!ativo || !d.ativo}
                        onChange={(e) => atualizarDia(i, { inicio: e.target.value })}
                        aria-label={`Início ${DIAS_LONGOS[i]}`}
                        className="h-9 w-[6.75rem] tabular-nums"
                      />
                      <span className="text-muted-foreground" aria-hidden>
                        –
                      </span>
                      <Input
                        type="time"
                        value={d.fim}
                        disabled={!ativo || !d.ativo}
                        onChange={(e) => atualizarDia(i, { fim: e.target.value })}
                        aria-label={`Fim ${DIAS_LONGOS[i]}`}
                        className="h-9 w-[6.75rem] tabular-nums"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!ativo || !d.ativo}
                      onClick={() => alternarPausa(i)}
                      className="ml-auto text-muted-foreground"
                      aria-expanded={aberta}
                      aria-label={`Pausa de ${DIAS_LONGOS[i]}`}
                    >
                      <span className="tabular-nums">
                        {pausaDefinida ? `Pausa ${d.pausa_inicio}–${d.pausa_fim}` : "Pausa"}
                      </span>
                      {aberta ? (
                        <ChevronUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {janelaInvalida && (
                    <p className="mt-2 text-xs text-destructive">
                      O fim precisa ser depois do início.
                    </p>
                  )}
                  {aberta && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-border pt-3">
                      <span className="w-20 flex-shrink-0 text-xs text-muted-foreground">Pausa</span>
                      <Input
                        type="time"
                        value={d.pausa_inicio}
                        disabled={!ativo || !d.ativo}
                        onChange={(e) => atualizarDia(i, { pausa_inicio: e.target.value })}
                        aria-label={`Início da pausa ${DIAS_LONGOS[i]}`}
                        className="h-9 w-[6.75rem] tabular-nums"
                      />
                      <span className="text-muted-foreground" aria-hidden>
                        –
                      </span>
                      <Input
                        type="time"
                        value={d.pausa_fim}
                        disabled={!ativo || !d.ativo}
                        onChange={(e) => atualizarDia(i, { pausa_fim: e.target.value })}
                        aria-label={`Fim da pausa ${DIAS_LONGOS[i]}`}
                        className="h-9 w-[6.75rem] tabular-nums"
                      />
                      {(d.pausa_inicio || d.pausa_fim) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!ativo || !d.ativo}
                          className="text-muted-foreground"
                          onClick={() => atualizarDia(i, { pausa_inicio: "", pausa_fim: "" })}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button onClick={() => void salvar()} disabled={salvando}>
            {salvando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      )}
    </div>
  );
}
