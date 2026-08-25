import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import { erroDaResposta } from "@/services/http-error";

// getApiUrl resolve o host por ambiente — URL relativa só funciona no dev com proxy.
const base = () => getApiUrl("/api/v1/whatsapp");

export type StatusInstancia = "criada" | "conectada" | "desconectada";

export type InstanciaConexao = {
  id: number;
  nome_exibicao: string | null;
  numero_mascarado: string | null;
  status: StatusInstancia;
  ultima_conexao_em: string | null;
  criado_em: string;
};

export type QrInstancia = {
  /** "conectada" | "aguardando" | "erro: <motivo>" */
  estado: string;
  /** data-uri pronto para <img src>, ou null enquanto o QR não sai. */
  qrcode: string | null;
};

export type ResultadoSincronizacao = {
  vistos: number;
  novos: number;
  atualizados: number;
  desativados: number;
};

export type GrupoWhatsapp = {
  id: number;
  jid: string;
  nome: string;
  foto_url: string | null;
  participantes: number;
  capacidade: number;
  sou_admin: boolean;
  permite_envio: boolean;
  link_convite: string | null;
  ativo: boolean;
  sub_id: string | null;
  instancia_ids: number[];
};

const json = async <T>(res: Response, fallback: string): Promise<T> => {
  if (!res.ok) throw await erroDaResposta(res, fallback);
  return res.json() as Promise<T>;
};

export async function listarInstancias(): Promise<InstanciaConexao[]> {
  const res = await fetchWithAuth(`${base()}/instancias`);
  return json(res, "Não foi possível carregar os números.");
}

export async function criarInstancia(nomeExibicao?: string): Promise<InstanciaConexao> {
  const res = await fetchWithAuth(`${base()}/instancias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nomeExibicao ? { nome_exibicao: nomeExibicao } : {}),
  });
  return json(res, "Não foi possível criar o número.");
}

export async function qrDaInstancia(id: number): Promise<QrInstancia> {
  const res = await fetchWithAuth(`${base()}/instancias/${id}/qr`);
  return json(res, "Não foi possível gerar o QR code.");
}

export async function removerInstancia(id: number): Promise<void> {
  const res = await fetchWithAuth(`${base()}/instancias/${id}`, { method: "DELETE" });
  if (!res.ok) throw await erroDaResposta(res, "Não foi possível remover o número.");
}

export async function sincronizarGrupos(id: number): Promise<ResultadoSincronizacao> {
  const res = await fetchWithAuth(`${base()}/instancias/${id}/sincronizar-grupos`, {
    method: "POST",
  });
  return json(res, "Não foi possível sincronizar os grupos.");
}

export type ListarGruposParams = {
  instanciaId?: number;
  q?: string;
  incluirInativos?: boolean;
};

// ⚠️ Nunca usar `user_id` como query param aqui — fetchWithAuth injeta o dele.
export async function listarGrupos(params: ListarGruposParams = {}): Promise<GrupoWhatsapp[]> {
  const query = new URLSearchParams();
  if (params.instanciaId != null) query.set("filter_instancia_id", String(params.instanciaId));
  if (params.q) query.set("q", params.q);
  if (params.incluirInativos) query.set("incluir_inativos", "true");
  const qs = query.toString();
  const sufixo = qs ? `?${qs}` : "";
  const res = await fetchWithAuth(`${base()}/grupos${sufixo}`);
  return json(res, "Não foi possível carregar os grupos.");
}
