import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Save } from "lucide-react";

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
};

/** O backend serializa `time` como "HH:MM:SS" — a tela trabalha com "HH:MM". */
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");

const paraForm = (dia?: JanelaDia): DiaForm => ({
  ativo: dia?.ativo ?? true,
  inicio: hhmm(dia?.inicio) || PADRAO_INICIO,
  fim: hhmm(dia?.fim) || PADRAO_FIM,
});

export function EnvioSection() {
  const { toast } = useToast();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // Desmarcado por padrão (§7.1) — quem manda mesmo é a config do backend,
  // aplicada logo abaixo quando a carga responde.
  const [ativo, setAtivo] = useState(false);
  const [dias, setDias] = useState<DiaForm[]>([]);
  // As 7 linhas ficam colapsadas por padrão (§7.2): o caso comum é uma janela
  // única, e as linhas abertas empurravam o resto da aba para fora da dobra.
  const [porDia, setPorDia] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const config = await obterConfigEnvio();
      setAtivo(config.ativo);
      setDias(Array.from({ length: 7 }, (_, i) => paraForm(config.dias?.[String(i)])));
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

  // Resumo do estado REAL — nunca um texto fixo que minta sobre a config salva.
  const resumo = useMemo(() => {
    const [primeiro] = dias;
    if (!primeiro) return "";
    const uniforme = dias.every(
      (d) => d.ativo === primeiro.ativo && d.inicio === primeiro.inicio && d.fim === primeiro.fim,
    );
    if (!uniforme) return "Personalizado por dia";
    if (!primeiro.ativo) return "Nenhum dia com envio";
    return `Todos os dias · ${primeiro.inicio} – ${primeiro.fim}`;
  }, [dias]);

  // Copia início/fim/toggle do primeiro dia ATIVO para os demais (§7.2).
  const aplicarATodos = () => {
    const modelo = dias.find((d) => d.ativo) ?? dias[0];
    if (!modelo) return;
    setDias((atual) => atual.map(() => ({ ...modelo })));
  };

  // "HH:MM" compara certo como string. O backend valida fim > início em TODOS
  // os dias (ativos ou não) — a validação aqui cobre o mesmo conjunto.
  const validar = (): string | null => {
    for (let i = 0; i < dias.length; i++) {
      if (dias[i].fim <= dias[i].inicio) {
        return `${DIAS_LONGOS[i]}: o fim precisa ser depois do início.`;
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
              // A pausa saiu da UI (§7.3); o PUT zera o que houver salvo.
              pausa_inicio: null,
              pausa_fim: null,
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
    <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
      {carregando ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      ) : erro ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">{erro}</p>
          <Button variant="outline" onClick={() => void carregar()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* A seção vive numa aba: o switch faz o papel de título. */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label htmlFor="restringir-horario" className="text-sm font-semibold">
                Restringir horário de envio
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Fora da janela, os envios pausam e retomam sozinhos na próxima abertura.
              </p>
            </div>
            <Switch id="restringir-horario" checked={ativo} onCheckedChange={setAtivo} />
          </div>

          <div className={cn("space-y-2", !ativo && "pointer-events-none opacity-50")}>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl border border-border px-3 py-2">
              <span className="text-sm text-foreground tabular-nums">{resumo}</span>
              <div className="flex items-center gap-1">
                {porDia && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!ativo}
                    onClick={aplicarATodos}
                    className="h-8 text-xs text-muted-foreground"
                  >
                    Aplicar a todos os dias
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!ativo}
                  onClick={() => setPorDia((v) => !v)}
                  aria-expanded={porDia}
                  className="h-8 text-xs text-muted-foreground"
                >
                  {porDia ? "Recolher" : "Personalizar por dia"}
                  {porDia ? (
                    <ChevronUp className="ml-1 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {porDia && (
              <div className="space-y-1.5">
                {dias.map((d, i) => {
                  const janelaInvalida = d.fim <= d.inicio;
                  return (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border px-2 py-1.5"
                    >
                      {/* w-[4.75rem]: o Switch come ~36px do rótulo e em w-16
                          "Sáb"/"Dom" saíam cortados ("Don") na validação. */}
                      <label className="flex w-[4.75rem] flex-shrink-0 items-center gap-1.5">
                        <Switch
                          checked={d.ativo}
                          disabled={!ativo}
                          onCheckedChange={(v) => atualizarDia(i, { ativo: v })}
                          aria-label={`${DIAS_LONGOS[i]} com envio`}
                        />
                        <span className="whitespace-nowrap text-xs font-medium text-foreground">
                          {DIAS_CURTOS[i]}
                        </span>
                      </label>
                      <Input
                        type="time"
                        value={d.inicio}
                        disabled={!ativo || !d.ativo}
                        onChange={(e) => atualizarDia(i, { inicio: e.target.value })}
                        aria-label={`Início ${DIAS_LONGOS[i]}`}
                        className="h-8 w-[6.25rem] text-xs tabular-nums"
                      />
                      <span className="text-xs text-muted-foreground" aria-hidden>
                        –
                      </span>
                      <Input
                        type="time"
                        value={d.fim}
                        disabled={!ativo || !d.ativo}
                        onChange={(e) => atualizarDia(i, { fim: e.target.value })}
                        aria-label={`Fim ${DIAS_LONGOS[i]}`}
                        className="h-8 w-[6.25rem] text-xs tabular-nums"
                      />
                      {janelaInvalida && (
                        <span className="text-xs text-destructive">
                          O fim precisa ser depois do início.
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Regra de borda (§7.4) — no lugar onde ficava a pausa. */}
            <p className="text-xs text-muted-foreground">
              Execução que começa dentro da janela é concluída, mesmo que ultrapasse o
              horário de fim.
            </p>
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
