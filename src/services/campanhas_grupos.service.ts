import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import { erroDaResposta } from "@/services/http-error";

// getApiUrl resolve o host por ambiente — URL relativa só funciona no dev com proxy.
const base = () => getApiUrl("/api/v1/campanhas-grupos");

export type StatusCampanha = "ativa" | "pausada" | "arquivada";
export type EstrategiaEntrada = "sequencial" | "aleatoria";
export type ModoImagem = "link_preview" | "imagem_normal";

export type CampanhaGrupos = {
  id: number;
  nome: string;
  descricao: string | null;
  status: StatusCampanha;
  estrategia_entrada: EstrategiaEntrada;
  abertura_automatica: boolean;
  reabertura_automatica: boolean;
  prefixo: string | null;
  sufixo: string | null;
  modo_imagem: ModoImagem;
  total_grupos: number;
  criado_em: string;
};

export type GrupoDaCampanha = {
  grupo_id: number;
  posicao: number;
  aberto: boolean;
  nome: string | null;
  participantes: number;
  permite_envio: boolean;
  ativo: boolean;
  sub_id: string | null;
};

export type CampanhaGruposDetalhe = CampanhaGrupos & { grupos: GrupoDaCampanha[] };

/** Campos editáveis via PATCH — qualquer subconjunto. */
export type CampanhaGruposPatch = Partial<{
  nome: string;
  descricao: string | null;
  status: StatusCampanha;
  estrategia_entrada: EstrategiaEntrada;
  abertura_automatica: boolean;
  reabertura_automatica: boolean;
  prefixo: string | null;
  sufixo: string | null;
  modo_imagem: ModoImagem;
}>;

/** Item do PUT de grupos — a tela manda a lista COMPLETA na ordem final. */
export type VinculoGrupo = {
  grupo_id: number;
  posicao: number;
  aberto: boolean;
};

const json = async <T>(res: Response, fallback: string): Promise<T> => {
  if (!res.ok) throw await erroDaResposta(res, fallback);
  return res.json() as Promise<T>;
};

export async function listarCampanhas(): Promise<CampanhaGrupos[]> {
  const res = await fetchWithAuth(base());
  return json(res, "Não foi possível carregar as campanhas.");
}

export async function criarCampanha(nome: string, descricao?: string): Promise<CampanhaGrupos> {
  const res = await fetchWithAuth(base(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(descricao ? { nome, descricao } : { nome }),
  });
  return json(res, "Não foi possível criar a campanha.");
}

export async function obterCampanha(id: number): Promise<CampanhaGruposDetalhe> {
  const res = await fetchWithAuth(`${base()}/${id}`);
  return json(res, "Não foi possível carregar a campanha.");
}

export async function atualizarCampanha(
  id: number,
  patch: CampanhaGruposPatch,
): Promise<CampanhaGrupos> {
  const res = await fetchWithAuth(`${base()}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return json(res, "Não foi possível salvar a campanha.");
}

/** Substitui o conjunto de grupos da campanha (lista completa, na ordem final). */
export async function definirGruposDaCampanha(
  id: number,
  vinculos: VinculoGrupo[],
): Promise<CampanhaGruposDetalhe> {
  const res = await fetchWithAuth(`${base()}/${id}/grupos`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vinculos),
  });
  return json(res, "Não foi possível salvar os grupos da campanha.");
}
