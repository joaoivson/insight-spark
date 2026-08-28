import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import { erroDaResposta } from "@/services/http-error";

const base = () => getApiUrl("/api/v1/admin");

/** Tipos aceitos pelo backend (app/models/whatsapp_proxies.py). */
export type TipoProxy = "movel" | "residencial" | "datacenter";
export type StatusProxy = "ok" | "degradado" | "quarentena";

export type Proxy = {
  id: number;
  rotulo: string;
  tipo: TipoProxy;
  /** `host:porta`. A credencial NUNCA vem do backend — nem mascarada. */
  servidor: string;
  pais: string;
  max_sessoes: number;
  ocupacao: number;
  ativo: boolean;
  status: StatusProxy;
  falhas_seguidas: number;
  tem_credencial: boolean;
  ultimo_erro: string | null;
  ultimo_ip: string | null;
  ultimo_pais: string | null;
  verificado_em: string | null;
  /** Deve ser 0 ou 1: duas afiliadas no mesmo IP fura a regra de afinidade. */
  usuarias: number;
  criado_em: string;
};

export type InstanciaProxy = {
  id: number;
  user_id: number;
  user_email: string | null;
  nome_exibicao: string | null;
  numero_mascarado: string | null;
  status: string;
  proxy_id: number | null;
  proxy_rotulo: string | null;
  proxy_status: StatusProxy | null;
  proxy_fixado_em: string | null;
  proxy_trocas: number;
  em_cooldown: boolean;
};

export type Pool = {
  proxies: Proxy[];
  instancias: InstanciaProxy[];
  /** Pool cadastrado ≠ pool em uso: a feature flag pode estar desligada. */
  ligado: boolean;
  obrigatorio: boolean;
};

export type ProxyCriar = {
  rotulo: string;
  tipo: TipoProxy;
  host: string;
  porta: number;
  usuario?: string | null;
  senha?: string | null;
  pais?: string;
  max_sessoes?: number | null;
};

export type ProxyAtualizar = Partial<ProxyCriar> & {
  ativo?: boolean;
  reativar_status?: boolean;
};

export type VerificacaoProxy = {
  ok: boolean;
  ip: string | null;
  pais: string | null;
  detalhe: string;
  status: StatusProxy;
};

export type RealocarResultado = {
  proxy_id: number | null;
  proxy_rotulo: string | null;
  aplicado_na_sessao: boolean;
  aviso: string | null;
};

const json = async <T>(res: Response, fallback: string): Promise<T> => {
  if (!res.ok) throw await erroDaResposta(res, fallback);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
};

export async function buscarPool(): Promise<Pool> {
  return json(await fetchWithAuth(`${base()}/proxies`), "Não foi possível carregar o pool.");
}

export async function criarProxy(dados: ProxyCriar): Promise<Proxy> {
  const res = await fetchWithAuth(`${base()}/proxies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return json(res, "Não foi possível cadastrar o proxy.");
}

export async function atualizarProxy(id: number, dados: ProxyAtualizar): Promise<Proxy> {
  const res = await fetchWithAuth(`${base()}/proxies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return json(res, "Não foi possível atualizar o proxy.");
}

export async function desativarProxy(id: number): Promise<void> {
  const res = await fetchWithAuth(`${base()}/proxies/${id}`, { method: "DELETE" });
  if (!res.ok) throw await erroDaResposta(res, "Não foi possível desativar o proxy.");
}

export async function verificarProxy(id: number): Promise<VerificacaoProxy> {
  const res = await fetchWithAuth(`${base()}/proxies/${id}/verificar`, { method: "POST" });
  return json(res, "Não foi possível verificar o proxy.");
}

export async function realocarProxy(
  instanciaId: number,
  dados: { motivo: string; ignorar_cooldown?: boolean; aplicar_na_sessao?: boolean },
): Promise<RealocarResultado> {
  const res = await fetchWithAuth(`${base()}/instancias/${instanciaId}/realocar-proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return json(res, "Não foi possível realocar o IP deste número.");
}

export const TIPO_LABELS: Record<TipoProxy, string> = {
  movel: "Móvel",
  residencial: "Residencial",
  datacenter: "Datacenter",
};

export const STATUS_LABELS: Record<StatusProxy, string> = {
  ok: "OK",
  degradado: "Degradado",
  quarentena: "Quarentena",
};
