import { useEffect, useMemo, useState } from "react";
import { Instagram, Loader2, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { useToast } from "@/hooks/use-toast";
import { listInstagramMedia } from "@/services/instagram.service";
import { cn } from "@/shared/lib/utils";
import type { InstagramMediaItem } from "@/shared/types/instagram";

/** Quantos posts ficam à mostra sem abrir o modal. */
const VISIVEIS = 4;
/** Teto de páginas puxadas ao abrir o modal, para a busca ver a lista toda. */
const MAX_PAGINAS_EXTRAS = 12;

const Thumb = ({
  item,
  ativo,
  onClick,
  altura,
}: {
  item: InstagramMediaItem;
  ativo: boolean;
  onClick: () => void;
  altura: string;
}) => (
  <button
    type="button"
    onClick={onClick}
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
        className={cn("w-full object-cover", altura)}
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
        }}
      />
    ) : (
      <span className={cn("flex w-full items-center justify-center bg-muted", altura)}>
        <Instagram className="h-5 w-5 text-muted-foreground" />
      </span>
    )}
    <span className="block space-y-0.5 px-2 py-1.5">
      <span className="block text-[10px] text-muted-foreground">
        {item.timestamp ? new Date(item.timestamp).toLocaleDateString("pt-BR") : "—"}
        {item.media_product_type === "REELS" ? " · Reels" : ""}
      </span>
      <span className="block truncate text-[11px] text-foreground">
        {item.caption_preview || "(sem legenda)"}
      </span>
    </span>
  </button>
);

/**
 * Escolha da publicação onde a automação vai funcionar.
 *
 * Mostra UMA fileira com as publicações mais recentes — cobre o caso comum, que
 * é armar a automação no post que acabou de subir. A grade inteira (a conta de
 * teste tem 224 posts) empurrava os cards 2, 3 e 4 para fora da tela, e a aluna
 * nem descobria que existiam; por isso o resto vive num modal.
 *
 * A busca no modal não é enfeite: com centenas de thumbnails parecidos e legenda
 * truncada, achar "aquele da escova" rolando é inviável.
 *
 * As publicações vêm com cache de 15 min no backend; "Atualizar" força a Meta.
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
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [paginasExtras, setPaginasExtras] = useState(0);

  const carregar = async (proximoCursor?: string | null, forcar = false) => {
    const primeira = !proximoCursor;
    if (primeira) setCarregando(true);
    else setCarregandoMais(true);
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

  // Buscar só no que já foi paginado não serve: a conta de teste tem 224 posts e
  // o post procurado costuma estar lá no fim. Ao abrir o modal, puxa o resto das
  // páginas (o backend cacheia 15 min, então é barato). O teto evita laço infinito
  // se a Meta devolver cursor para sempre.
  useEffect(() => {
    if (!modalAberto || !cursor || carregandoMais) return;
    if (paginasExtras >= MAX_PAGINAS_EXTRAS) return;
    setPaginasExtras((n) => n + 1);
    void carregar(cursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalAberto, cursor, carregandoMais, paginasExtras]);

  // A escolhida sempre aparece na fileira, mesmo vindo do fim da lista pelo modal.
  const emDestaque = useMemo(() => {
    const primeiros = itens.slice(0, VISIVEIS);
    if (!selecionado || primeiros.some((i) => i.id === selecionado)) return primeiros;
    const escolhida = itens.find((i) => i.id === selecionado);
    return escolhida ? [escolhida, ...primeiros.slice(0, VISIVEIS - 1)] : primeiros;
  }, [itens, selecionado]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return itens;
    return itens.filter((i) => (i.caption_preview || "").toLowerCase().includes(termo));
  }, [itens, busca]);

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
        <p className="text-sm text-muted-foreground">Nenhuma publicação encontrada nesta conta.</p>
        <Button variant="outline" size="sm" onClick={() => void carregar(null, true)}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {emDestaque.map((item) => (
          <Thumb
            key={item.id}
            item={item}
            ativo={selecionado === item.id}
            onClick={() => onSelecionar(item)}
            altura="h-[120px]"
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => setModalAberto(true)}
        >
          Escolher outra publicação
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void carregar(null, true)}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      <ResponsiveModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        title="Escolher publicação"
        contentClassName="sm:max-w-2xl"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pela legenda"
              className="pl-9"
              aria-label="Buscar publicação pela legenda"
            />
          </div>

          <div className="max-h-[55vh] overflow-y-auto pr-1">
            {filtrados.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma publicação com “{busca}” na legenda.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filtrados.map((item) => (
                  <Thumb
                    key={item.id}
                    item={item}
                    ativo={selecionado === item.id}
                    onClick={() => {
                      onSelecionar(item);
                      setModalAberto(false);
                    }}
                    altura="h-[110px]"
                  />
                ))}
              </div>
            )}

            {cursor && paginasExtras >= MAX_PAGINAS_EXTRAS && (
              <div className="flex justify-center pt-3">
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
        </div>
      </ResponsiveModal>
    </div>
  );
};
