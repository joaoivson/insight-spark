import type { KeyboardEvent, MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Link2, MoreVertical, Pencil, QrCode, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { InstanciaConexao } from "@/services/whatsapp_conexoes.service";
import { cn } from "@/shared/lib/utils";

export const CORES_DO_STATUS: Record<
  InstanciaConexao["status"],
  { dot: string; texto: string; rotulo: string }
> = {
  conectada: { dot: "bg-emerald-500", texto: "text-emerald-500", rotulo: "Conectado" },
  desconectada: { dot: "bg-destructive", texto: "text-destructive", rotulo: "Desconectado" },
  criada: { dot: "bg-muted-foreground", texto: "text-muted-foreground", rotulo: "Aguardando conexão" },
};

/**
 * A linha de baixo do card: o número, ou o que fazer quando não há número.
 *
 * "Desconectado" e "Aguardando conexão" são estados DIFERENTES e mostravam a
 * mesma frase ("Número ainda não pareado") — quem já tinha pareado e caiu lia
 * que nunca havia pareado. Cada um tem a sua ação:
 *   criada        → nunca pareou; precisa parear pela primeira vez
 *   desconectada  → já pareou e caiu; precisa reconectar (e o número, quando
 *                   conhecido, continua sendo a identidade do chip)
 */
export const legendaDoNumero = (instancia: InstanciaConexao): string => {
  if (instancia.numero_mascarado) return instancia.numero_mascarado;
  return instancia.status === "desconectada"
    ? "Conexão perdida — reconecte para voltar a enviar"
    : "Número ainda não pareado";
};

type Props = {
  instancia: InstanciaConexao;
  /** Só a contagem — a lista de grupos vive na página do número (spec §6.2). */
  totalDeGrupos: number;
  onConectar: (i: InstanciaConexao) => void;
  onConectarPorLink: (i: InstanciaConexao) => void;
  onGerenciar: (i: InstanciaConexao) => void;
  onRemover: (i: InstanciaConexao) => void;
  onAlternarPausa: (i: InstanciaConexao, pausado: boolean) => void;
};

/**
 * Card compacto de um número (spec §6.1) — status, nome, número e contagem
 * de grupos. O corpo inteiro navega para a página do número; switch, menu e
 * "Conectar" param a propagação para não arrastar a navegação junto.
 */
export function DispositivoCard({
  instancia,
  totalDeGrupos,
  onConectar,
  onConectarPorLink,
  onGerenciar,
  onRemover,
  onAlternarPausa,
}: Props) {
  const navigate = useNavigate();
  const conectada = instancia.status === "conectada";
  const cores = CORES_DO_STATUS[instancia.status];
  const nome = instancia.nome_exibicao || `Número ${instancia.id}`;

  const abrir = () => navigate(`/dashboard/configuracoes/numeros/${instancia.id}`);

  // Enter/Espaço abrem o card, mas só quando o foco está NELE — sem o guard,
  // Enter num item do menu navegaria junto.
  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrir();
    }
  };

  const semNavegar = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Abrir ${nome}`}
      onClick={abrir}
      onKeyDown={aoTeclar}
      className={cn(
        "rounded-xl border border-border bg-card p-4 text-left cursor-pointer transition-colors",
        "hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Pausado fica visivelmente apagado: o chip está lá, conectado, e
        // mesmo assim não dispara — sem o contraste isso não se lê.
        instancia.envio_pausado && "opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Wrap em vez de truncate: no 390 o badge de pausa disputava a linha
            e o status virava "Conect…" — o dado principal cortado pelo secundário. */}
        <div className="flex items-center gap-x-2 gap-y-1 min-w-0 flex-wrap">
          <span className={cn("h-2 w-2 rounded-full flex-shrink-0", cores.dot)} />
          <span className={cn("text-xs font-medium whitespace-nowrap", cores.texto)}>
            {cores.rotulo}
          </span>
          {instancia.envio_pausado && (
            <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-500 whitespace-nowrap">
              Envio pausado
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={semNavegar}>
          {/* Só quem está conectado tem envio para pausar. */}
          {conectada && (
            <Switch
              checked={!instancia.envio_pausado}
              onCheckedChange={(ligado) => onAlternarPausa(instancia, !ligado)}
              aria-label={
                instancia.envio_pausado
                  ? "Retomar o envio por este número"
                  : "Pausar o envio por este número"
              }
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Ações do número</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onGerenciar(instancia)}>
                <Pencil className="h-4 w-4 mr-2" />
                Renomear
              </DropdownMenuItem>
              {!conectada && (
                <DropdownMenuItem onClick={() => onConectarPorLink(instancia)}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Conectar por link
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onRemover(instancia)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3 min-w-0">
        <p className="font-semibold text-foreground truncate">{nome}</p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {legendaDoNumero(instancia)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <span className="tabular-nums">{totalDeGrupos}</span>{" "}
          {totalDeGrupos === 1 ? "grupo" : "grupos"}
        </p>
        {conectada ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        ) : (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onConectar(instancia);
            }}
          >
            <QrCode className="h-4 w-4 mr-1.5" />
            Conectar
          </Button>
        )}
      </div>
    </div>
  );
}
