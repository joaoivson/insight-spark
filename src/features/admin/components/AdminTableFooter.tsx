import { Link } from "react-router-dom";
import type { SyncRunUser } from "@/services/admin-panel.service";

// Os helpers de paginação vivem em components/shared: a aba Anúncios das
// campanhas de grupos usa os mesmos, e importar de features/admin cruzaria a
// fronteira de feature. Reexportados para não quebrar quem já importa daqui.
export {
  LINHAS_POR_PAGINA,
  OPCOES_POR_PAGINA,
  Paginacao,
  paginar,
  totalDePaginas,
} from "@/components/shared/Paginacao";

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
