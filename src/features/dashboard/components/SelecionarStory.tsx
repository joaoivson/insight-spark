import { useEffect, useState } from "react";
import { Instagram, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { listInstagramStories } from "@/services/instagram.service";
import { cn } from "@/shared/lib/utils";
import type { InstagramMediaItem } from "@/shared/types/instagram";

/**
 * Escolha do STORY em que a automação vai funcionar.
 *
 * Bem mais simples que o seletor de publicações: story vive 24h, então a lista
 * é curta por natureza — sem paginação, sem busca, sem modal. O aviso de
 * validade fica aqui porque é a única surpresa real do escopo: o story expira
 * e a automação para junto (quem quer continuidade usa "Qualquer story").
 */
export const SelecionarStory = ({
  selecionado,
  onSelecionar,
}: {
  selecionado?: string | null;
  onSelecionar: (item: InstagramMediaItem) => void;
}) => {
  const { toast } = useToast();
  const [itens, setItens] = useState<InstagramMediaItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    setCarregando(true);
    try {
      const pagina = await listInstagramStories();
      setItens(pagina.items);
    } catch (e) {
      toast({
        title: "Erro ao carregar stories",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando seus stories…
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum story ativo agora. Publique o story no Instagram e toque em Atualizar.
        </p>
        <Button variant="outline" size="sm" onClick={() => void carregar()}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {itens.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelecionar(item)}
            className={cn(
              "group overflow-hidden rounded-xl border-2 text-left transition-colors",
              selecionado === item.id
                ? "border-primary"
                : "border-transparent hover:border-border",
            )}
            aria-pressed={selecionado === item.id}
          >
            {item.thumbnail_url ? (
              <img
                src={item.thumbnail_url}
                alt=""
                // Story é vertical (9:16) — thumb alta, não a quadrada dos posts.
                className="h-[150px] w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                }}
              />
            ) : (
              <span className="flex h-[150px] w-full items-center justify-center bg-muted">
                <Instagram className="h-5 w-5 text-muted-foreground" />
              </span>
            )}
            <span className="block px-2 py-1.5 text-[10px] text-muted-foreground">
              {item.timestamp
                ? new Date(item.timestamp).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
              {item.media_type === "VIDEO" ? " · Vídeo" : ""}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Story expira em 24h — quando ele sair do ar, esta automação para junto. Para
        valer sempre, escolha “Qualquer story”.
      </p>
    </div>
  );
};
