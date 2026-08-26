/** Erro vindo da API, com o que a tela precisa saber para decidir o que mostrar. */
export type ErroDeApi = Error & {
  /** Código estruturado do backend (ex.: PLANO_INSUFICIENTE). */
  code?: string;
  /**
   * `true` só quando a mensagem saiu do `detail` do backend — texto escrito
   * para a usuária. Corpo cru (HTML de proxy, stack do FastAPI) nunca recebe
   * a marca, e por isso nunca chega à tela via `mensagemAmigavel`.
   */
  amigavel?: boolean;
};

/**
 * Lê o erro do backend com o detalhe legível.
 *
 * As rotas devolvem `detail` ora como string, ora como objeto
 * `{code, message}` (conta não profissional, plano insuficiente, sync
 * bloqueado em homologação). Mostrar o JSON cru na tela seria ilegível —
 * o toast exibiria literalmente `{"detail":"..."}`.
 */
export const erroDaResposta = async (res: Response, fallback: string): Promise<ErroDeApi> => {
  const texto = await res.text();
  if (!texto) return new Error(fallback);
  try {
    const corpo = JSON.parse(texto);
    const detail = corpo?.detail;
    if (typeof detail === "string") {
      const erro: ErroDeApi = new Error(detail);
      erro.amigavel = true;
      return erro;
    }
    if (detail?.message) {
      const erro: ErroDeApi = new Error(detail.message);
      erro.code = detail.code;
      erro.amigavel = true;
      return erro;
    }
  } catch {
    /* não era JSON — cai no texto cru */
  }
  // Corpo cru: 502 do proxy, página de erro do FastAPI, HTML do nginx. NÃO é
  // amigável — vai para o log/mensagem técnica, nunca para a tela.
  return new Error(texto || fallback);
};

/**
 * Texto seguro para renderizar como estado de erro.
 *
 * Só devolve a mensagem do backend quando ela veio do `detail` (marcada em
 * `erroDaResposta`). Qualquer outra coisa — corpo cru de proxy, TypeError de
 * dentro do `fetchWithAuth`, falha de rede — vira a frase fixa em PT-BR:
 * a regra proíbe vazar mensagem técnica para a usuária.
 */
export const mensagemAmigavel = (e: unknown, fallback: string): string => {
  const erro = e as ErroDeApi | undefined;
  return erro?.amigavel && erro.message ? erro.message : fallback;
};
