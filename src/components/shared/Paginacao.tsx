import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const LINHAS_POR_PAGINA = 20;

/** Opções do seletor — o mesmo conjunto já usado em AdSpends e ChannelPerformance. */
export const OPCOES_POR_PAGINA = [25, 50, 100] as const;

export function paginar<T>(itens: T[], pagina: number, porPagina = LINHAS_POR_PAGINA) {
  return itens.slice((pagina - 1) * porPagina, pagina * porPagina);
}

export function totalDePaginas(total: number, porPagina = LINHAS_POR_PAGINA) {
  return Math.max(1, Math.ceil(total / porPagina));
}

export function Paginacao({
  pagina,
  total,
  onChange,
  porPagina = LINHAS_POR_PAGINA,
  formato = "registros",
  onPorPaginaChange,
  opcoesPorPagina = OPCOES_POR_PAGINA,
  rotulo = "registro",
  rotuloPlural = "registros",
}: {
  pagina: number;
  total: number;
  onChange: (p: number) => void;
  porPagina?: number;
  formato?: "registros" | "intervalo";
  /** Quando passado, mostra o seletor de itens por página. */
  onPorPaginaChange?: (n: number) => void;
  opcoesPorPagina?: readonly number[];
  rotulo?: string;
  rotuloPlural?: string;
}) {
  const paginas = totalDePaginas(total, porPagina);
  // Com seletor, a barra continua útil numa página só (dá para mudar o tamanho).
  if (paginas <= 1 && !onPorPaginaChange) return null;
  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(pagina * porPagina, total);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        {formato === "intervalo"
          ? `Mostrando ${inicio}–${fim} de ${total}`
          : `${total} ${total === 1 ? rotulo : rotuloPlural} · página ${pagina} de ${paginas}`}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {onPorPaginaChange && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Por página</Label>
            <Select
              value={String(porPagina)}
              onValueChange={(v) => {
                onPorPaginaChange(Number(v));
                onChange(1); // trocar o tamanho na página 7 deixaria a lista vazia
              }}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opcoesPorPagina.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={pagina <= 1}
          onClick={() => onChange(pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pagina >= paginas}
          onClick={() => onChange(pagina + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
