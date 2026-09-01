import { useState } from "react";
import {
  ChevronDown,
  Link2,
  Loader2,
  MoreVertical,
  Pencil,
  QrCode,
  RefreshCw,
  Smartphone,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { GruposDoDispositivo } from "@/components/whatsapp/GruposDoDispositivo";
import type { GrupoWhatsapp, InstanciaConexao } from "@/services/whatsapp_conexoes.service";
import { cn } from "@/shared/lib/utils";
import { formatDateTime } from "@/shared/lib/utils";

const CORES_DO_STATUS: Record<InstanciaConexao["status"], { dot: string; texto: string; rotulo: string }> = {
  conectada: { dot: "bg-emerald-500", texto: "text-emerald-500", rotulo: "Conectado" },
  desconectada: { dot: "bg-destructive", texto: "text-destructive", rotulo: "Desconectado" },
  criada: { dot: "bg-muted-foreground", texto: "text-muted-foreground", rotulo: "Aguardando conexão" },
};

type Props = {
  instancia: InstanciaConexao;
  /** Já filtrados para este dispositivo. */
  grupos: GrupoWhatsapp[];
  /** Todos os dispositivos — para o "também em: X" dos grupos compartilhados. */
  instancias: InstanciaConexao[];
  sincronizando: boolean;
  onSincronizar: (i: InstanciaConexao) => void;
  onConectar: (i: InstanciaConexao) => void;
  onConectarPorLink: (i: InstanciaConexao) => void;
  onGerenciar: (i: InstanciaConexao) => void;
  onRemover: (i: InstanciaConexao) => void;
  onAlternarPausa: (i: InstanciaConexao, pausado: boolean) => void;
};

export function DispositivoCard({
  instancia,
  grupos,
  instancias,
  sincronizando,
  onSincronizar,
  onConectar,
  onConectarPorLink,
  onGerenciar,
  onRemover,
  onAlternarPausa,
}: Props) {
  const conectada = instancia.status === "conectada";
  // Nasce recolhido: a lista de grupos é longa e empurra os outros números
  // para fora da tela. Quem quer ver, abre.
  const [aberto, setAberto] = useState(false);
  const cores = CORES_DO_STATUS[instancia.status];
  const nome = instancia.nome_exibicao || `Número ${instancia.id}`;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card overflow-hidden",
        // Pausado fica visivelmente apagado: o chip está lá, conectado, e
        // mesmo assim não dispara — sem o contraste isso não se lê.
        instancia.envio_pausado && "opacity-75",
      )}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          {/* Wrap em vez de truncate: no 390 o badge de pausa disputava a
              linha e o status virava "Conect…" — o dado mais importante do
              card cortado por causa do secundário. */}
          <div className="flex items-center gap-x-2 gap-y-1 min-w-0 flex-wrap">
            <span className={cn("h-2 w-2 rounded-full flex-shrink-0", cores.dot)} />
            <span className={cn("text-sm font-medium whitespace-nowrap", cores.texto)}>
              {cores.rotulo}
            </span>
            {instancia.envio_pausado && (
              <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-500 whitespace-nowrap">
                Envio pausado
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Só quem está conectado tem envio para pausar. */}
            {conectada && (
              <Switch
                checked={!instancia.envio_pausado}
                onCheckedChange={(ligado) => onAlternarPausa(instancia, !ligado)}
                aria-label={
                  instancia.envio_pausado ? "Retomar o envio por este número" : "Pausar o envio por este número"
                }
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
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

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onGerenciar(instancia)}
              className="group flex items-center gap-1.5 text-left"
            >
              <span className="font-semibold text-foreground truncate">{nome}</span>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 flex-shrink-0" />
            </button>
            <p className="text-sm text-muted-foreground tabular-nums">
              {instancia.numero_mascarado || "Número ainda não pareado"}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="tabular-nums">{grupos.length}</span>{" "}
          {grupos.length === 1 ? "grupo" : "grupos"}
          {conectada && instancia.ultima_conexao_em && (
            <> · conectado desde {formatDateTime(instancia.ultima_conexao_em)}</>
          )}
        </p>
      </div>

      <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
        {conectada ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSincronizar(instancia)}
            disabled={sincronizando}
          >
            {sincronizando ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Sincronizar grupos
          </Button>
        ) : (
          <Button size="sm" onClick={() => onConectar(instancia)}>
            <QrCode className="h-4 w-4 mr-1.5" />
            Conectar
          </Button>
        )}

        {grupos.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
          >
            Grupos ({grupos.length})
            <ChevronDown
              className={cn("h-4 w-4 ml-1.5 transition-transform", aberto && "rotate-180")}
            />
          </Button>
        )}
      </div>

      {/* Os dois vazios são diferentes e pedem ações diferentes: mandar
          conectar quem JÁ está conectado é o que fez parecer que a conexão
          não tinha sido reconhecida. */}
      {grupos.length === 0 ? (
        <div className="border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {conectada
              ? "Nenhum grupo ainda. Use “Sincronizar grupos”."
              : "Nenhum grupo ainda. Conecte este número e sincronize."}
          </p>
        </div>
      ) : (
        aberto && (
          <div className="border-t border-border p-4">
            <GruposDoDispositivo
              grupos={grupos}
              instancias={instancias}
              instanciaId={instancia.id}
            />
          </div>
        )
      )}
    </div>
  );
}
