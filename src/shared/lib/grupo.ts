/**
 * Rótulo de um grupo de WhatsApp para a tela.
 *
 * `nome` é nullable no backend: o sync grava `None` quando o WhatsApp não
 * devolve `subject`/`name`. Renderizar `null` cru mostra um item em branco —
 * a afiliada vê um checkbox sem rótulo e não sabe o que está marcando.
 */
export const rotuloDoGrupo = (nome: string | null | undefined, id?: number): string =>
  (nome ?? "").trim() || (id != null ? `Grupo ${id}` : "Grupo sem nome");
