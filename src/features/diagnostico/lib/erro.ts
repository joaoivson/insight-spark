/**
 * Extrai mensagem legível dos erros da API do Diagnóstico IA.
 *
 * Compartilhado entre a tela e o chat: o 402 (sem créditos) chega com `detail`
 * como objeto `{code, saldo, necessario, message}`, enquanto os demais erros
 * chegam com `detail` string. Sem esse tratamento a aluna vê "[object Object]".
 */
export function mensagemDoErro(e: unknown, padrao = "Algo deu errado. Tente de novo."): string {
  if (e && typeof e === "object" && "detail" in e) {
    const detail = (e as { detail?: unknown }).detail;

    if (typeof detail === "string" && detail.trim()) return detail;

    if (detail && typeof detail === "object") {
      const d = detail as { message?: unknown; saldo?: unknown; necessario?: unknown };
      if (typeof d.message === "string" && d.message.trim()) return d.message;
      // Fallback para um backend que mande só os números do saldo
      if (typeof d.saldo === "number" && typeof d.necessario === "number") {
        return `Créditos insuficientes: você tem ${d.saldo} e precisa de ${d.necessario}.`;
      }
    }
  }
  return e instanceof Error && e.message ? e.message : padrao;
}
