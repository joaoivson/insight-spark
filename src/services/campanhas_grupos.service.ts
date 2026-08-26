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

// ── Link de entrada (F6) ─────────────────────────────────────────────────────

/** Eventos que o pixel do Facebook dispara na página do link. */
export type PixelEventos = {
  pageview: boolean;
  lead: boolean;
};

export type CampanhaLink = {
  id: number;
  slug: string;
  /** URL pública — é o que a afiliada divulga. */
  url: string;
  /** Mesma rota em modo teste: entra na campanha sem contar nas métricas. */
  url_teste: string;
  titulo_previa: string | null;
  descricao_previa: string | null;
  banner_previa_url: string | null;
  pixel_facebook_id: string | null;
  pixel_eventos: PixelEventos;
  ativo: boolean;
};

/** Campos editáveis do link — qualquer subconjunto. */
export type CampanhaLinkPatch = Partial<{
  titulo_previa: string | null;
  descricao_previa: string | null;
  banner_previa_url: string | null;
  pixel_facebook_id: string | null;
  pixel_eventos: PixelEventos;
  ativo: boolean;
}>;

export type TipoEventoGrupo = "entrada" | "saida";
export type OrigemEventoGrupo = "link" | "organica" | "desconhecida";

/** Entrada ou saída de um grupo da campanha — sem nenhum dado pessoal. */
export type EventoDeGrupo = {
  tipo: TipoEventoGrupo;
  origem: OrigemEventoGrupo;
  grupo_id: number;
  grupo: string | null;
  /** ISO 8601. Vem nulo quando o banco ainda não carimbou a data. */
  quando: string | null;
};

/** O link é criado na primeira visita — a tela não precisa "gerar" nada. */
export async function obterLinkDaCampanha(id: number): Promise<CampanhaLink> {
  const res = await fetchWithAuth(`${base()}/${id}/link`);
  return json(res, "Não foi possível carregar o link de entrada.");
}

export async function atualizarLinkDaCampanha(
  id: number,
  patch: CampanhaLinkPatch,
): Promise<CampanhaLink> {
  const res = await fetchWithAuth(`${base()}/${id}/link`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return json(res, "Não foi possível salvar o link de entrada.");
}

/** Feed de entradas e saídas, do mais recente para o mais antigo. */
export async function listarAtividade(id: number, limite = 50): Promise<EventoDeGrupo[]> {
  const res = await fetchWithAuth(`${base()}/${id}/atividade?limite=${limite}`);
  const corpo = await json<{ eventos: EventoDeGrupo[] }>(
    res,
    "Não foi possível carregar a atividade.",
  );
  return corpo.eventos ?? [];
}
