import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { useToast } from "@/hooks/use-toast";
import { mensagemAmigavel } from "@/services/http-error";
import {
  criarConvite,
  listarConvites,
  revogarConvite,
  type ConviteAtivo,
  type ConviteConexao,
  type InstanciaConexao,
} from "@/services/whatsapp_conexoes.service";

const MS_POR_MINUTO = 60_000;

/** "vale por 15 minutos" — lido do prazo real, não de um número fixo na tela. */
const minutosAte = (iso: string) => {
  const fim = new Date(iso).getTime();
  if (Number.isNaN(fim)) return null;
  const restam = Math.round((fim - Date.now()) / MS_POR_MINUTO);
  return restam > 0 ? restam : null;
};

const horaCurta = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

type Props = {
  /** Aberto quando há um número alvo (a `instancia` do backend). */
  instancia: InstanciaConexao | null;
  onOpenChange: (aberto: boolean) => void;
};

/**
 * Item 18 — link temporário para outra pessoa escanear o QR deste número.
 *
 * A `url` só existe na resposta do POST: o backend guarda o hash e depois nem
 * ele consegue remontá-la. Por isso a tela grita que fechar sem copiar obriga a
 * gerar outro, e por isso um link já ativo aparece sem a URL.
 */
export function ConviteConexaoModal({ instancia, onOpenChange }: Props) {
  const { toast } = useToast();

  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const [ativos, setAtivos] = useState<ConviteAtivo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gerado, setGerado] = useState<ConviteConexao | null>(null);
  const [gerando, setGerando] = useState(false);
  const [revogando, setRevogando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Guarda de resposta obsoleta: abrir o modal de um número e trocar para outro
  // deixa a primeira busca no ar — sem isso ela pinta o link do número errado.
  const buscaAtual = useRef(0);

  const carregar = useCallback(async (instanciaId: number) => {
    const chamada = ++buscaAtual.current;
    setCarregando(true);
    setErro(null);
    try {
      const lista = await listarConvites(instanciaId);
      if (chamada !== buscaAtual.current || !montado.current) return;
      setAtivos(lista);
    } catch (e) {
      if (chamada !== buscaAtual.current || !montado.current) return;
      setErro(mensagemAmigavel(e, "Não foi possível verificar os links deste número."));
    } finally {
      if (chamada === buscaAtual.current && montado.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!instancia) return;
    setGerado(null);
    setCopiado(false);
    void carregar(instancia.id);
  }, [instancia, carregar]);

  const gerar = async () => {
    if (!instancia) return;
    setGerando(true);
    try {
      const convite = await criarConvite(instancia.id);
      if (!montado.current) return;
      setGerado(convite);
      setCopiado(false);
      // Criar revoga os anteriores no backend — a lista precisa refletir isso.
      await carregar(instancia.id);
    } catch (e) {
      if (montado.current) {
        toast({
          title: mensagemAmigavel(e, "Não foi possível gerar o link."),
          variant: "destructive",
        });
      }
    } finally {
      if (montado.current) setGerando(false);
    }
  };

  const revogar = async (id: number) => {
    if (!instancia) return;
    setRevogando(true);
    try {
      await revogarConvite(id);
      if (!montado.current) return;
      setGerado((atual) => (atual?.id === id ? null : atual));
      toast({ title: "Link cancelado" });
      await carregar(instancia.id);
    } catch (e) {
      if (montado.current) {
        toast({
          title: mensagemAmigavel(e, "Não foi possível cancelar o link."),
          variant: "destructive",
        });
      }
    } finally {
      if (montado.current) setRevogando(false);
    }
  };

  const copiar = async () => {
    if (!gerado) return;
    try {
      await navigator.clipboard.writeText(gerado.url);
      setCopiado(true);
      toast({ title: "Link copiado" });
    } catch {
      toast({ title: "Copie o link manualmente.", variant: "destructive" });
    }
  };

  const ativo = ativos[0] ?? null;
  const prazo = gerado ? minutosAte(gerado.expira_em) : ativo ? minutosAte(ativo.expira_em) : null;
  const hora = gerado ? horaCurta(gerado.expira_em) : ativo ? horaCurta(ativo.expira_em) : null;

  return (
    <ResponsiveModal
      open={!!instancia}
      onOpenChange={onOpenChange}
      title="Conectar por link"
      description="Quem abrir este link consegue conectar um número à sua conta. Mande só para quem vai escanear."
    >
      <div className="space-y-4 pb-2">
        {carregando && !gerado ? (
          <div className="space-y-3">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-9 w-40 rounded-xl" />
          </div>
        ) : erro && !gerado ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{erro}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => instancia && void carregar(instancia.id)}
            >
              Tentar novamente
            </Button>
          </div>
        ) : gerado ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={gerado.url}
                aria-label="Link de conexão"
                onFocus={(e) => e.currentTarget.select()}
                className="h-11 flex-1 text-xs"
              />
              <Button
                size="icon"
                variant="outline"
                className="h-11 w-11 flex-shrink-0"
                onClick={() => void copiar()}
              >
                {copiado ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copiar link</span>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Vale por {prazo ?? 15} minutos{hora ? `, até ${hora}` : ""}.
            </p>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 space-y-1">
              <p className="text-xs text-amber-500">
                Copie agora: o link aparece só desta vez. Se fechar sem copiar, é preciso gerar
                outro.
              </p>
              <p className="text-xs text-amber-500">Gerar um link novo invalida este.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void gerar()} disabled={gerando}>
                {gerando ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Gerar novo link
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => void revogar(gerado.id)}
                disabled={revogando}
              >
                {revogando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cancelar link
              </Button>
            </div>
          </div>
        ) : ativo ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-border p-3 space-y-1">
              <p className="text-sm font-medium text-foreground">Já existe um link ativo.</p>
              <p className="text-xs text-muted-foreground">
                Vale por mais {prazo ?? 0} minutos{hora ? `, até ${hora}` : ""}. Ele não pode ser
                mostrado de novo — guardamos só a forma cifrada.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Gerar um link novo invalida o anterior.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void gerar()} disabled={gerando}>
                {gerando ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Gerar novo link
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => void revogar(ativo.id)}
                disabled={revogando}
              >
                {revogando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cancelar link
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Nenhum link ativo para {instancia?.nome_exibicao || `Número ${instancia?.id ?? ""}`}.
            </p>
            <Button className="w-full sm:w-auto" onClick={() => void gerar()} disabled={gerando}>
              {gerando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Gerar link
            </Button>
            <p className="text-xs text-muted-foreground">
              O link vale por 15 minutos e aparece uma única vez.
            </p>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}
