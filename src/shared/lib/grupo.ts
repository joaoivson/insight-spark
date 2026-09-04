/**
 * Rótulo de um grupo de WhatsApp para a tela.
 *
 * `nome` é nullable no backend: o sync grava `None` quando o WhatsApp não
 * devolve `subject`/`name`. Renderizar `null` cru mostra um item em branco —
 * a afiliada vê um checkbox sem rótulo e não sabe o que está marcando.
 */
export const rotuloDoGrupo = (nome: string | null | undefined, id?: number): string =>
  (nome ?? "").trim() || (id != null ? `Grupo ${id}` : "Grupo sem nome");

/**
 * Sufixo curto do JID, para diferenciar grupos de nome IDÊNTICO.
 *
 * Acontece de verdade — dois "#130 SALESDASH + VENDE-C" (347 e 2
 * participantes) são grupos distintos, o padrão de grupo sucessor. Sem nada
 * que os separe na linha, a afiliada ativa o errado.
 *
 * O JID (`120363044…@g.us`) é a única identidade estável que a tela tem: a
 * data que guardamos é a do primeiro sync, igual para os dois quando entram
 * juntos, então ela não diferencia nada.
 */
export const fragmentoDoJid = (jid: string | null | undefined): string => {
  const numero = (jid ?? "").split("@")[0];
  return numero ? `…${numero.slice(-6)}` : "";
};

/**
 * Nomes que aparecem mais de uma vez na lista — só nesses o fragmento do JID
 * entra na linha. Mostrar em todas as linhas seria ruído em 493 grupos.
 */
export const nomesDuplicados = (
  grupos: { nome: string | null; id: number }[],
): Set<string> => {
  const vistos = new Map<string, number>();
  grupos.forEach((g) => {
    const rotulo = rotuloDoGrupo(g.nome, g.id);
    vistos.set(rotulo, (vistos.get(rotulo) ?? 0) + 1);
  });
  return new Set([...vistos.entries()].filter(([, n]) => n > 1).map(([r]) => r));
};
