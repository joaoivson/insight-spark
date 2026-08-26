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

// ── Anúncios vinculados e resultados (F7) ────────────────────────────────────

/** Campanha de anúncio do Meta, com a flag do multi-select desta campanha. */
export type AnuncioVinculavel = {
  id: number;
  /** Nullable no backend (`Campaign.name`) — ler sem fallback derruba a tela. */
  nome: string | null;
  status: string | null;
  sub_id: string | null;
  vinculada: boolean;
  /**
   * Nome da OUTRA campanha de grupos que já reivindica este anúncio (`null` se
   * livre). Vem no próprio payload — a tela não precisa de uma segunda request
   * a `/vinculos-de-anuncio` para descobrir a mesma coisa.
   */
  vinculada_em_outra: { id: number; nome: string } | null;
};

/** Uma linha por grupo da campanha, no período consultado. */
export type LinhaResultado = {
  grupo_id: number;
  grupo: string | null;
  sub_id: string | null;
  participantes: number;
  entradas: number;
  saidas: number;
  ficaram: number;
  evasao_pct: number;
  mensagens: number;
  cliques: number;
  pedidos: number;
  comissao_liquida: number;
  gasto_atribuido: number;
  lucro: number;
  /** `null` quando não há participante: a métrica não existe. 0,00 diria
   *  "cada pessoa rende zero", que é outra afirmação. */
  lucro_por_pessoa: number | null;
};

/** Rodapé de totais — as mesmas grandezas, sem os identificadores do grupo. */
export type TotaisResultado = Omit<LinhaResultado, "grupo_id" | "grupo" | "sub_id" | "evasao_pct">;

/**
 * Bloco de investimento do topo.
 *
 * `null` ≠ `0`: sem pixel configurado o backend manda `null` em leads/cpl, e
 * sem entrada no período manda `null` nos custos. A tela mostra "—" com a nota
 * do motivo — exibir 0 diria "ninguém virou lead", que é outra coisa.
 */
export type AnunciosDoResultado = {
  campanhas_vinculadas: number;
  investimento: number;
  investimento_com_imposto: number;
  leads: number | null;
  cpl: number | null;
  custo_por_entrada: number | null;
  custo_por_permanencia: number | null;
};

export type ResultadosDaCampanha = {
  periodo: { inicio: string; fim: string };
  linhas: LinhaResultado[];
  totais: TotaisResultado;
  anuncios: AnunciosDoResultado;
};

/** campaign_id do Meta → campanha de grupos que o reivindica (selo da tela de Anúncios). */
export type VinculoDeAnuncio = { id: number; nome: string };

/** Todas as campanhas de anúncio da usuária + quais estão nesta campanha. */
export async function listarAnunciosDaCampanha(id: number): Promise<AnuncioVinculavel[]> {
  const res = await fetchWithAuth(`${base()}/${id}/anuncios`);
  const corpo = await json<{ anuncios: AnuncioVinculavel[] }>(
    res,
    "Não foi possível carregar os anúncios.",
  );
  return corpo.anuncios ?? [];
}

/** Substitui o conjunto de anúncios vinculados (lista completa de ids selecionados). */
export async function definirAnunciosDaCampanha(
  id: number,
  ids: number[],
): Promise<AnuncioVinculavel[]> {
  const res = await fetchWithAuth(`${base()}/${id}/anuncios`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids),
  });
  const corpo = await json<{ anuncios: AnuncioVinculavel[] }>(
    res,
    "Não foi possível salvar os anúncios vinculados.",
  );
  return corpo.anuncios ?? [];
}

export async function obterResultados(
  id: number,
  periodo: { inicio: string; fim: string },
): Promise<ResultadosDaCampanha> {
  const query = new URLSearchParams({ inicio: periodo.inicio, fim: periodo.fim });
  const res = await fetchWithAuth(`${base()}/${id}/resultados?${query}`);
  return json(res, "Não foi possível carregar os resultados.");
}

/** Nome do arquivo no Content-Disposition — o header some quando o CORS não o expõe. */
const nomeDoAnexo = (header: string | null): string | null => {
  if (!header) return null;
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) return decodeURIComponent(utf8[1]);
  const simples = header.match(/filename="?([^";]+)"?/i);
  return simples ? simples[1].trim() : null;
};

/**
 * Busca o CSV de entradas do PERÍODO selecionado. Precisa passar pelo `fetchWithAuth`
 * (o endpoint exige Authorization) — `<a download>` direto devolveria 401.
 *
 * Devolve o dado; quem dispara o download é a tela. Service não mexe em DOM.
 */
export async function exportarLeads(
  id: number,
  periodo: { inicio: string; fim: string },
): Promise<{ blob: Blob; nome: string }> {
  const query = new URLSearchParams({ inicio: periodo.inicio, fim: periodo.fim });
  const res = await fetchWithAuth(`${base()}/${id}/leads/export?${query}`);
  if (!res.ok) throw await erroDaResposta(res, "Não foi possível exportar as entradas.");

  return {
    blob: await res.blob(),
    nome: nomeDoAnexo(res.headers.get("Content-Disposition")) ?? "entradas.csv",
  };
}

/** Mapa campaign_id (Meta) → campanha de grupos. Uma request para toda a lista. */
export async function listarVinculosDeAnuncio(): Promise<Record<string, VinculoDeAnuncio>> {
  const res = await fetchWithAuth(`${base()}/vinculos-de-anuncio`);
  const corpo = await json<{ vinculos: Record<string, VinculoDeAnuncio> }>(
    res,
    "Não foi possível carregar os vínculos de anúncio.",
  );
  return corpo.vinculos ?? {};
}

// ── Resumo consolidado do Dashboard (F7) ─────────────────────────────────────

export type ResumoPorCampanha = {
  campanha_id: number;
  nome: string;
  grupos: number;
  participantes: number;
  entradas: number;
  comissao_liquida: number;
  lucro: number;
  /** `null` quando não há participante: a métrica não existe. 0,00 diria
   *  "cada pessoa rende zero", que é outra afirmação. */
  lucro_por_pessoa: number | null;
};

/**
 * Totais somados de todas as campanhas ativas — o bloco secundário do Dashboard.
 *
 * `leads` e `custo_por_entrada` vêm `null` quando não há pixel / não há entrada no
 * período: a tela mostra "—", nunca 0.
 */
export type ResumoDeGrupos = {
  periodo: { inicio: string; fim: string };
  /** Total REAL de campanhas ativas — não o número somado (ver `campanhas_omitidas`). */
  campanhas_ativas: number;
  /** Quantas ficaram de fora do corte do backend. > 0 = os totais não são de tudo. */
  campanhas_omitidas: number;
  totais: TotaisResultado;
  investimento: number;
  investimento_com_imposto: number;
  leads: number | null;
  custo_por_entrada: number | null;
  por_campanha: ResumoPorCampanha[];
};

/**
 * Sem período, o backend assume os últimos 30 dias — é o que acontece quando a
 * usuária limpa o filtro do Dashboard.
 */
export async function obterResumoDeGrupos(periodo?: {
  inicio?: string;
  fim?: string;
}): Promise<ResumoDeGrupos> {
  const query = new URLSearchParams();
  if (periodo?.inicio) query.set("inicio", periodo.inicio);
  if (periodo?.fim) query.set("fim", periodo.fim);
  const sufixo = query.toString() ? `?${query}` : "";
  const res = await fetchWithAuth(`${base()}/resumo${sufixo}`);
  return json(res, "Não foi possível carregar o resumo das campanhas de grupos.");
}
