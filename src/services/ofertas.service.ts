import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import { erroDaResposta } from "@/services/http-error";

// getApiUrl resolve o host por ambiente — URL relativa só funciona no dev com proxy.
const base = () => getApiUrl("/api/v1/ofertas");

export type Oferta = {
  item_id: string;
  nome: string;
  imagem_url: string | null;
  loja: string | null;
  preco: number;
  preco_de: number | null;
  desconto_pct: number;
  comissao_pct: number;
  comissao_valor: number;
  vendas: number;
  avaliacao: number | null;
  url: string;
};

export type BuscaOfertasResultado = {
  ofertas: Oferta[];
  pagina: number;
  tem_proxima: boolean;
  total_na_pagina: number;
  termo_usado: string;
  /** True quando não houve termo: é a vitrine que a tela abre por
   *  padrão, não um resultado de busca. */
  vitrine?: boolean;
};

export type OrdenacaoOferta =
  | "relevancia"
  | "mais_vendidos"
  | "maior_comissao"
  | "menor_preco";

export type BuscaOfertasParams = {
  /** Termo obrigatório na prática: sem palavra-chave a API do marketplace volta vazia. */
  q?: string;
  categoria?: string;
  ordenacao?: OrdenacaoOferta;
  pagina?: number;
  limite?: number;
  /** Os três abaixo filtram a PÁGINA devolvida — é o que o backend faz. */
  comissao_minima?: number;
  preco_max?: number;
  desconto_minimo?: number;
  /**
   * Conta que assina a busca. O nome do parâmetro precisa do prefixo
   * `filter_`: `fetchWithAuth` injeta `user_id` em toda request e qualquer
   * param com esse nome seria sobrescrito em silêncio.
   */
  filter_integracao_id?: number;
};

export type ProvedorMarketplace = "shopee";

export type Integracao = {
  id: number;
  provedor: string;
  label: string;
  ativa: boolean;
  app_id_mascarado: string;
  criado_em: string;
};

export type IntegracaoPayload = {
  provedor: ProvedorMarketplace;
  label: string;
  app_id: string;
  senha: string;
};

/**
 * Por que a busca tem erro tipado e não só `Error`: cada motivo pede uma tela
 * diferente (banner de conectar conta, seletor de conta, aviso de termo curto).
 * Comparar string de mensagem para decidir isso quebra na primeira mudança de
 * copy do backend.
 */
export type MotivoFalhaBusca = "termo" | "escolha" | "sem_conta" | "desconhecido";

export class BuscaOfertasError extends Error {
  readonly motivo: MotivoFalhaBusca;
  /** Labels das contas ativas do mesmo marketplace (motivo "escolha"). */
  readonly escolha: string[];
  readonly provedor: string | null;

  constructor(
    mensagem: string,
    motivo: MotivoFalhaBusca,
    escolha: string[] = [],
    provedor: string | null = null,
  ) {
    super(mensagem);
    this.name = "BuscaOfertasError";
    this.motivo = motivo;
    this.escolha = escolha;
    this.provedor = provedor;
  }
}

const falhaDaBusca = async (res: Response): Promise<BuscaOfertasError> => {
  const texto = await res.text();
  let detail: unknown = null;
  try {
    detail = texto ? (JSON.parse(texto) as { detail?: unknown }).detail : null;
  } catch {
    /* corpo não era JSON — cai no fallback por status */
  }

  if (res.status === 409 && detail && typeof detail === "object") {
    const d = detail as { escolha?: string[]; provedor?: string };
    return new BuscaOfertasError(
      "Você tem mais de uma conta conectada nesse marketplace. Escolha qual usar.",
      "escolha",
      Array.isArray(d.escolha) ? d.escolha : [],
      d.provedor ?? null,
    );
  }

  const mensagem = typeof detail === "string" && detail.trim() ? detail : null;
  if (res.status === 422) {
    return new BuscaOfertasError(mensagem ?? "Digite o que você quer buscar.", "termo");
  }
  if (res.status === 404) {
    return new BuscaOfertasError(
      mensagem ?? "Nenhuma conta de marketplace conectada.",
      "sem_conta",
    );
  }
  return new BuscaOfertasError(
    mensagem ?? "Não conseguimos buscar ofertas agora. Tente de novo em instantes.",
    "desconhecido",
  );
};

export async function buscarOfertas(
  params: BuscaOfertasParams,
): Promise<BuscaOfertasResultado> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null || valor === "") return;
    qs.set(chave, String(valor));
  });
  const res = await fetchWithAuth(`${base()}?${qs.toString()}`);
  if (!res.ok) throw await falhaDaBusca(res);
  return (await res.json()) as BuscaOfertasResultado;
}

export async function listarIntegracoes(): Promise<Integracao[]> {
  const res = await fetchWithAuth(`${base()}/integracoes`);
  if (!res.ok) throw await erroDaResposta(res, "Não foi possível carregar suas contas.");
  return (await res.json()) as Integracao[];
}

export async function criarIntegracao(payload: IntegracaoPayload): Promise<Integracao> {
  const res = await fetchWithAuth(`${base()}/integracoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await erroDaResposta(res, "Não foi possível salvar a conta.");
  return (await res.json()) as Integracao;
}

export async function alternarIntegracao(id: number, ativa: boolean): Promise<Integracao> {
  const res = await fetchWithAuth(`${base()}/integracoes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ativa }),
  });
  if (!res.ok) throw await erroDaResposta(res, "Não foi possível alterar a conta.");
  return (await res.json()) as Integracao;
}

export async function removerIntegracao(id: number): Promise<void> {
  const res = await fetchWithAuth(`${base()}/integracoes/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    throw await erroDaResposta(res, "Não foi possível remover a conta.");
  }
}
