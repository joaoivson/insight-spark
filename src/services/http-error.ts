/**
 * Lê o erro do backend com o detalhe legível.
 *
 * As rotas devolvem `detail` ora como string, ora como objeto
 * `{code, message}` (conta não profissional, plano insuficiente, sync
 * bloqueado em homologação). Mostrar o JSON cru na tela seria ilegível —
 * o toast exibiria literalmente `{"detail":"..."}`.
 */
export const erroDaResposta = async (res: Response, fallback: string): Promise<Error> => {
  const texto = await res.text();
  if (!texto) return new Error(fallback);
  try {
    const corpo = JSON.parse(texto);
    const detail = corpo?.detail;
    if (typeof detail === "string") return new Error(detail);
    if (detail?.message) {
      const erro = new Error(detail.message) as Error & { code?: string };
      erro.code = detail.code;
      return erro;
    }
  } catch {
    /* não era JSON — cai no texto cru */
  }
  return new Error(texto || fallback);
};
