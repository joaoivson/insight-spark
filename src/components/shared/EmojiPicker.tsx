import { Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Seletor de emoji para os campos de texto da automação.
 *
 * Lista curta e escolhida a dedo em vez de biblioteca: o conjunto que aparece
 * numa mensagem de afiliado é pequeno e previsível, e uma lib de emoji custa
 * centenas de KB no bundle de uma tela que a aluna abre pelo celular.
 */
const GRUPOS: { titulo: string; emojis: string[] }[] = [
  {
    titulo: "Mais usados",
    emojis: ["✨", "🔥", "💙", "❤️", "😍", "🥰", "😉", "🙌", "👇", "👉", "✅", "🎁"],
  },
  {
    titulo: "Compra",
    emojis: ["🛒", "🛍️", "💸", "💰", "🏷️", "📦", "🚚", "⭐", "🤩", "💎", "🔗", "📲"],
  },
  {
    titulo: "Reação",
    emojis: ["😱", "😂", "🤣", "😅", "🥹", "👏", "💪", "🙏", "👀", "💬", "⏰", "🚨"],
  },
];

export const EmojiPicker = ({
  onEscolher,
  rotulo = "Inserir emoji",
}: {
  onEscolher: (emoji: string) => void;
  rotulo?: string;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" type="button" aria-label={rotulo} className="h-8 w-8">
        <Smile className="h-4 w-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[268px] p-3" align="end">
      <div className="space-y-3">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {grupo.titulo}
            </p>
            <div className="grid grid-cols-6 gap-1">
              {grupo.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onEscolher(emoji)}
                  className="rounded-md p-1.5 text-lg leading-none transition-colors hover:bg-accent"
                  aria-label={`Inserir ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PopoverContent>
  </Popover>
);
