import { useEffect, useState } from "react";
import { Instagram, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { listInstagramMedia } from "@/services/instagram.service";
import { cn } from "@/shared/lib/utils";
import type { InstagramMediaItem } from "@/shared/types/instagram";

/**
 * Grade de publicações para escolher onde a automação vai funcionar.
 *
 * As publicações vêm com cache de 15 min no backend; o botão de atualizar força
 * a busca na Meta quando a aluna acabou de publicar algo.
 */
export const SelecionarPublicacao = ({
  selecionado,
  onSelecionar,
}: {
  selecionado?: string | null;
  onSelecionar: (item: InstagramMediaItem) => void;
}) => {
  const { toast } = useToast();
  const [itens, setItens] = useState<InstagramMediaItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);

  const carregar = async (proximoCursor?: string | null, forcar = false) => {
    const primeira = !proximoCursor;
    if (primeira) {
      setCarregando(true);
    } else {
      setCarregandoMais(true);
    }
    try {
      const pagina = await listInstagramMedia(proximoCursor, forcar);
      setItens((atual) => (primeira ? pagina.items : [...atual, ...pagina.items]));
      setCursor(pagina.next_cursor);
    } catch (e) {
      toast({
        title: "Erro ao carregar publicações",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setCarregando(false);
      setCarregandoMais(false);
    }
  };

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando suas publicações…
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma publicação encontrada nesta conta.
        </p>
        <Button variant="outline" size="sm" onClick={() => void carregar(null, true)}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => void carregar(null, true)}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {itens.map((item) => {
          const ativo = selecionado === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelecionar(item)}
              className={cn(
                "group overflow-hidden rounded-xl border-2 text-left transition-colors",
                ativo ? "border-primary" : "border-transparent hover:border-border",
              )}
              aria-pressed={ativo}
            >
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt=""
                  className="h-[120px] w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                  }}
                />
              ) : (
                <span className="flex h-[120px] w-full items-center justify-center bg-muted">
                  <Instagram className="h-5 w-5 text-muted-foreground" />
                </span>
              )}
              <span className="block space-y-0.5 px-2 py-1.5">
                <span className="block text-[10px] text-muted-foreground">
                  {item.timestamp
                    ? new Date(item.timestamp).toLocaleDateString("pt-BR")
                    : "—"}
                  {item.media_product_type === "REELS" ? " · Reels" : ""}
                </span>
                <span className="block truncate text-[11px] text-foreground">
                  {item.caption_preview || "(sem legenda)"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {cursor && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void carregar(cursor)}
            disabled={carregandoMais}
          >
            {carregandoMais && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
};
