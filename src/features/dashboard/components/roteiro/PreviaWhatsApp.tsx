import { Image as ImageIcon } from "lucide-react";

import type { BlocoIn } from "@/services/roteiros.service";
import { cn } from "@/shared/lib/utils";

/**
 * Prévia do passo como bolha de WhatsApp.
 *
 * As cores são literais de propósito — é a única exceção à regra de usar as
 * variáveis do tema. A tela está IMITANDO outro produto: a bolha só cumpre o
 * papel de prévia se for reconhecível como WhatsApp, e uma bolha `bg-primary`
 * não é. Os dois valores são os da conversa real (claro `#d9fdd3`, escuro
 * `#005c4b`) e o par escuro é aplicado por `dark:`, então o tema continua
 * mandando em qual dos dois aparece.
 */
const BOLHA =
  "bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]";

const horaAgora = () =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

const Bolha = ({ bloco }: { bloco: BlocoIn }) => {
  const imagem = bloco.tipo === "imagem";
  const legenda = imagem ? bloco.legenda : bloco.conteudo;
  return (
    <div className="flex justify-end">
      <div
        className={cn(
          "max-w-[85%] min-w-0 space-y-1.5 rounded-xl rounded-tr-sm px-2.5 py-1.5 shadow-sm",
          BOLHA,
        )}
      >
        {imagem &&
          (bloco.conteudo ? (
            <img
              src={bloco.conteudo}
              alt=""
              className="max-h-52 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-28 w-44 items-center justify-center rounded-lg bg-black/10">
              <ImageIcon className="h-6 w-6 opacity-50" />
            </div>
          ))}
        {legenda?.trim() ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-snug">
            {legenda}
          </p>
        ) : (
          !imagem && (
            <p className="text-sm italic leading-snug opacity-60">Sem texto</p>
          )
        )}
        <p className="text-right text-[10px] leading-none opacity-60 tabular-nums">
          {horaAgora()}
        </p>
      </div>
    </div>
  );
};

/**
 * Fundo de conversa. Também literal, e pelo mesmo motivo da bolha: o contraste
 * entre bolha e fundo é o que faz a prévia parecer o WhatsApp.
 */
export const PreviaWhatsApp = ({
  blocos,
  nomeDoGrupo,
  vazio = "Adicione uma mensagem para ver a prévia.",
}: {
  blocos: BlocoIn[];
  nomeDoGrupo?: string;
  vazio?: string;
}) => (
  <div className="overflow-hidden rounded-xl border border-border">
    <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-3 py-2">
      <span className="h-6 w-6 flex-shrink-0 rounded-full bg-primary/20" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
        {nomeDoGrupo || "Seu grupo"}
      </span>
    </div>
    <div className="max-h-[28vh] space-y-1.5 overflow-y-auto bg-[#efeae2] p-3 dark:bg-[#0b141a] lg:max-h-[52vh]">
      {blocos.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#667781] dark:text-[#8696a0]">
          {vazio}
        </p>
      ) : (
        blocos.map((b, i) => <Bolha key={i} bloco={b} />)
      )}
    </div>
  </div>
);
