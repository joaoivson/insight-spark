/**
 * Marcas que o lucide-react não tem.
 *
 * Facebook e Instagram vêm do lucide (`<Facebook />`, `<Instagram />`); WhatsApp
 * e Shopee não existem lá, e o que estava no lugar delas era ícone genérico —
 * balão de conversa e sacola de compras. Aqui ficam as duas, com a mesma API do
 * lucide (`className`, cor por `currentColor`) para trocarem no mesmo lugar sem
 * ajuste de layout.
 *
 * Marketplace sem logo fiel usa `MarcaMarketplace` (tile com a inicial na cor da
 * marca) — melhor uma marca honesta do que um logo errado de memória.
 */
import { cn } from "@/shared/lib/utils";

type IconeProps = { className?: string };

/**
 * Logo do WhatsApp. Estava copiado em `DashboardSidebar` e `MobileBottomNav`;
 * este é o mesmo path das duas — elas passaram a importar daqui.
 */
export const WhatsAppLogo = ({ className }: IconeProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn("h-6 w-6", className)} aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/**
 * Sacola do Shopee: a alça em arco sobre o corpo trapezoidal.
 * Contorno (não sólido) para casar com o peso dos ícones do lucide ao lado.
 */
export const ShopeeIcon = ({ className }: IconeProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-6 w-6", className)}
    aria-hidden="true"
  >
    {/* alça */}
    <path d="M8.2 7.5V6.3a3.8 3.8 0 0 1 7.6 0v1.2" />
    {/* corpo da sacola */}
    <path d="M4.4 7.5h15.2l-1.05 12.1a1.6 1.6 0 0 1-1.6 1.4H7.05a1.6 1.6 0 0 1-1.6-1.4z" />
    {/* o "S" central */}
    <path d="M13.9 11.9a2.4 2.4 0 0 0-2.1-.9c-1.1 0-1.9.6-1.9 1.4 0 2 4.2 1.1 4.2 3.3 0 .9-.9 1.6-2.2 1.6a2.7 2.7 0 0 1-2.2-1" />
  </svg>
);

/** Cor de marca por marketplace — usada no tile e no anel de selecionado. */
const CORES: Record<string, { texto: string; fundo: string }> = {
  shopee: { texto: "text-orange-500", fundo: "bg-orange-500/10" },
  mercado_livre: { texto: "text-yellow-500", fundo: "bg-yellow-500/10" },
  amazon: { texto: "text-amber-500", fundo: "bg-amber-500/10" },
  magalu: { texto: "text-blue-500", fundo: "bg-blue-500/10" },
};

const INICIAIS: Record<string, string> = {
  mercado_livre: "ML",
  amazon: "a",
  magalu: "M",
};

/**
 * Tile de marketplace: logo fiel quando existe (Shopee), inicial na cor da
 * marca quando não. Desenhar Mercado Livre / Amazon / Magalu de memória sairia
 * errado — e logo errado é pior do que inicial.
 */
export const MarcaMarketplace = ({
  provedor,
  className,
}: {
  provedor: string;
  className?: string;
}) => {
  const cor = CORES[provedor] ?? { texto: "text-muted-foreground", fundo: "bg-muted" };
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl flex-shrink-0",
        cor.fundo,
        className ?? "h-11 w-11",
      )}
    >
      {provedor === "shopee" ? (
        <ShopeeIcon className={cn("h-6 w-6", cor.texto)} />
      ) : (
        <span className={cn("text-base font-bold leading-none", cor.texto)}>
          {INICIAIS[provedor] ?? provedor.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
};
