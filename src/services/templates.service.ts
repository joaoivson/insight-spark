import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import { erroDaResposta } from "@/services/http-error";

// getApiUrl resolve o host por ambiente — URL relativa só funciona no dev com proxy.
const base = () => getApiUrl("/api/v1/templates");

export type TipoTemplate = "oferta" | "livre";

export type Template = {
  id: number;
  nome: string;
  tipo: TipoTemplate;
  ativo: boolean;
  total_variacoes: number;
  criado_em: string;
};

export type Variacao = {
  id: number;
  corpo: string;
  /** Peso do sorteio, 1..100 — quanto maior, mais a variação aparece. */
  peso: number;
  ativa: boolean;
};

/** Item do PUT de variações — a tela manda a lista COMPLETA. */
export type VariacaoIn = {
  corpo: string;
  peso: number;
  ativa: boolean;
};

export type TemplateDetalhe = Template & { variacoes: Variacao[] };

export type EstiloIa = { id: string; descricao: string };

/** `disponivel: false` = a IA não está configurada — a tela some com o botão. */
export type EstilosIa = { disponivel: boolean; estilos: EstiloIa[] };

export type VariacoesGeradas = { variacoes: string[]; salvas: number };

const json = async <T>(res: Response, fallback: string): Promise<T> => {
  if (!res.ok) throw await erroDaResposta(res, fallback);
  return res.json() as Promise<T>;
};

export async function listarTemplates(): Promise<Template[]> {
  const res = await fetchWithAuth(base());
  return json(res, "Não foi possível carregar os templates.");
}

export async function criarTemplate(
  nome: string,
  tipo: TipoTemplate = "oferta",
): Promise<TemplateDetalhe> {
  const res = await fetchWithAuth(base(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, tipo }),
  });
  return json(res, "Não foi possível criar o template.");
}

export async function obterTemplate(id: number): Promise<TemplateDetalhe> {
  const res = await fetchWithAuth(`${base()}/${id}`);
  return json(res, "Não foi possível carregar o template.");
}

export async function atualizarTemplate(
  id: number,
  patch: Partial<{ nome: string; tipo: TipoTemplate; ativo: boolean }>,
): Promise<TemplateDetalhe> {
  const res = await fetchWithAuth(`${base()}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return json(res, "Não foi possível salvar o template.");
}

/** Substitui as variações do template (lista completa). */
export async function definirVariacoes(
  id: number,
  variacoes: VariacaoIn[],
): Promise<TemplateDetalhe> {
  const res = await fetchWithAuth(`${base()}/${id}/variacoes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(variacoes),
  });
  return json(res, "Não foi possível salvar as variações.");
}

export async function removerTemplate(id: number): Promise<void> {
  const res = await fetchWithAuth(`${base()}/${id}`, { method: "DELETE" });
  if (!res.ok) throw await erroDaResposta(res, "Não foi possível excluir o template.");
}

export async function estilosDeIa(): Promise<EstilosIa> {
  const res = await fetchWithAuth(`${base()}/estilos`);
  return json(res, "Não foi possível carregar os estilos.");
}

export async function gerarVariacoes(
  id: number,
  payload: { texto_base: string; estilo?: string; quantidade: number; salvar: boolean },
): Promise<VariacoesGeradas> {
  const res = await fetchWithAuth(`${base()}/${id}/gerar-variacoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  // 503 (IA desligada) e 502 (falhou agora) já vêm com mensagem amigável do backend.
  return json(res, "Não foi possível gerar as variações agora.");
}
