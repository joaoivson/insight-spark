import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listarAtividade,
  type EventoDeGrupo,
  type OrigemEventoGrupo,
} from "@/services/campanhas_grupos.service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/shared/lib/utils";

const ROTULO_ORIGEM: Record<OrigemEventoGrupo, string> = {
  link: "pelo link",
  organica: "orgânica",
  desconhecida: "origem desconhecida",
};

const quandoRelativo = (iso: string | null) => {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return formatDistanceToNow(data, { addSuffix: true, locale: ptBR });
};

const quandoExato = (iso: string | null) => {
  if (!iso) return undefined;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? undefined : data.toLocaleString("pt-BR");
};

const LinhaEvento = ({ evento }: { evento: EventoDeGrupo }) => {
  const entrada = evento.tipo === "entrada";
  const Icone = entrada ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
          entrada ? "bg-emerald-500/10" : "bg-destructive/10",
        )}
      >
        <Icone
          className={cn("h-4 w-4", entrada ? "text-emerald-500" : "text-destructive")}
          aria-hidden
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {entrada ? "Entrada" : "Saída"}
          <span className="font-normal text-muted-foreground"> · {ROTULO_ORIGEM[evento.origem]}</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {evento.grupo ?? "(grupo sem nome)"}
        </p>
      </div>
      <span
        className="flex-shrink-0 text-xs text-muted-foreground"
        title={quandoExato(evento.quando)}
      >
        {quandoRelativo(evento.quando)}
      </span>
    </div>
  );
};

/** Aba "Atividade": últimas entradas e saídas dos grupos da campanha. */
export const AtividadeDaCampanha = ({ campanhaId }: { campanhaId: number }) => {
  const { toast } = useToast();
  const [eventos, setEventos] = useState<EventoDeGrupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(
    async (silencioso = false) => {
      if (silencioso) setAtualizando(true);
      else setCarregando(true);
      setErro(null);
      try {
        setEventos(await listarAtividade(campanhaId, 50));
      } catch (e) {
        // Falha ao ATUALIZAR não pode apagar o feed que já está na tela —
        // erro passageiro destruiria 50 eventos já carregados.
        if (silencioso) {
          toast({
            title: "Não foi possível atualizar",
            description: (e as Error).message,
            variant: "destructive",
          });
        } else {
          setErro((e as Error).message);
        }
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    [campanhaId, toast],
  );

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-xs text-muted-foreground">
          Só registramos entradas e saídas a partir de agora — não há histórico anterior.
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={carregando || atualizando}
          onClick={() => void carregar(true)}
        >
          {atualizando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      {carregando ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : erro ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">{erro}</p>
            <Button variant="outline" onClick={() => void carregar()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : eventos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma entrada ou saída registrada ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {eventos.map((e, i) => (
            <LinhaEvento key={`${e.grupo_id}-${e.quando ?? i}-${i}`} evento={e} />
          ))}
        </div>
      )}
    </div>
  );
};
