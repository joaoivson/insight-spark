import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { SyncRunUser } from "@/services/admin-panel.service";

export const LINHAS_POR_PAGINA = 20;

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
}: {
  pagina: number;
  total: number;
  onChange: (p: number) => void;
  porPagina?: number;
  formato?: "registros" | "intervalo";
}) {
  const paginas = totalDePaginas(total, porPagina);
  if (paginas <= 1) return null;
  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(pagina * porPagina, total);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        {formato === "intervalo"
          ? `Mostrando ${inicio}–${fim} de ${total}`
          : `${total} ${total === 1 ? "registro" : "registros"} · página ${pagina} de ${paginas}`}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>
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

/** "User: 20" é id interno e não diz nada — mostra nome (e-mail) clicável. */
export function CelulaUsuaria({
  usuario,
  userId,
}: {
  usuario: SyncRunUser | null | undefined;
  userId: number | null | undefined;
}) {
  if (!usuario) return <span className="text-muted-foreground">{userId ?? "—"}</span>;
  return (
    <Link
      to={`/admin/clientes/${usuario.user_id}`}
      className="hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="font-medium">{usuario.nome}</span>
      {usuario.email && (
        <span className="ml-1 text-xs text-muted-foreground">({usuario.email})</span>
      )}
    </Link>
  );
}
