import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import type {
  AutomacaoStatus,
  InstagramAutomation,
  InstagramAutomationPayload,
  InstagramConnection,
  InstagramMediaPage,
} from "@/shared/types/instagram";

const BASE = "/api/v1/instagram";

/**
 * Lê o erro do backend com o detalhe legível.
 *
 * As rotas devolvem `detail` ora como string, ora como objeto
 * `{code, message}` (conta não profissional, plano insuficiente, conta já
 * conectada). Mostrar o JSON cru na tela seria ilegível.
 */
const erroDaResposta = async (res: Response, fallback: string): Promise<Error> => {
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

// ---------------------------------------------------------------- conexão --

export const getInstagramConnection = async (): Promise<InstagramConnection | null> => {
  const res = await fetchWithAuth(getApiUrl(`${BASE}/connection`));
  if (res.status === 404 || res.status === 204) return null;
  if (!res.ok) throw await erroDaResposta(res, "Erro ao buscar a conexão do Instagram");
  return (await res.json()) as InstagramConnection | null;
};

export const getInstagramAuthUrl = async (redirectUri: string): Promise<string> => {
  const res = await fetchWithAuth(
    getApiUrl(`${BASE}/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`),
  );
  if (!res.ok) throw await erroDaResposta(res, "Erro ao gerar o link de login do Instagram");
  return (await res.json()).url as string;
};

export const completeInstagramOAuth = async (
  code: string,
  redirectUri: string,
): Promise<InstagramConnection> => {
  const res = await fetchWithAuth(getApiUrl(`${BASE}/oauth/callback`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  if (!res.ok) throw await erroDaResposta(res, "Erro ao conectar com o Instagram");
  return (await res.json()) as InstagramConnection;
};

/** Refaz a inscrição da conta no webhook de comentários. */
export const subscribeInstagramWebhook = async (): Promise<InstagramConnection> => {
  const res = await fetchWithAuth(getApiUrl(`${BASE}/connection/subscribe`), { method: "POST" });
  if (!res.ok) throw await erroDaResposta(res, "Erro ao ativar o recebimento de comentários");
  return (await res.json()) as InstagramConnection;
};

export const disconnectInstagram = async (): Promise<void> => {
  const res = await fetchWithAuth(getApiUrl(`${BASE}/connection`), { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw await erroDaResposta(res, "Erro ao desconectar");
};

// ------------------------------------------------------------ publicações --

export const listInstagramMedia = async (
  cursor?: string | null,
  refresh = false,
): Promise<InstagramMediaPage> => {
  const qs = new URLSearchParams();
  if (cursor) qs.set("cursor", cursor);
  if (refresh) qs.set("refresh", "true");
  const sufixo = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetchWithAuth(getApiUrl(`${BASE}/media${sufixo}`));
  if (!res.ok) throw await erroDaResposta(res, "Erro ao carregar suas publicações");
  return (await res.json()) as InstagramMediaPage;
};

// -------------------------------------------------------------- automações --

export const listAutomations = async (): Promise<InstagramAutomation[]> => {
  const res = await fetchWithAuth(getApiUrl(`${BASE}/automations`));
  if (!res.ok) throw await erroDaResposta(res, "Erro ao carregar as automações");
  return (await res.json()) as InstagramAutomation[];
};

export const getAutomation = async (id: number): Promise<InstagramAutomation> => {
  const res = await fetchWithAuth(getApiUrl(`${BASE}/automations/${id}`));
  if (!res.ok) throw await erroDaResposta(res, "Erro ao carregar a automação");
  return (await res.json()) as InstagramAutomation;
};

export const createAutomation = async (
  payload: InstagramAutomationPayload,
): Promise<InstagramAutomation> => {
  const res = await fetchWithAuth(getApiUrl(`${BASE}/automations`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await erroDaResposta(res, "Erro ao criar a automação");
  return (await res.json()) as InstagramAutomation;
};

export const updateAutomation = async (
  id: number,
  payload: InstagramAutomationPayload,
): Promise<InstagramAutomation> => {
  const res = await fetchWithAuth(getApiUrl(`${BASE}/automations/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await erroDaResposta(res, "Erro ao salvar a automação");
  return (await res.json()) as InstagramAutomation;
};

export const setAutomationStatus = async (
  id: number,
  status: AutomacaoStatus,
): Promise<InstagramAutomation> => {
  const res = await fetchWithAuth(getApiUrl(`${BASE}/automations/${id}/status`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw await erroDaResposta(res, "Erro ao alterar o status");
  return (await res.json()) as InstagramAutomation;
};

export const duplicateAutomation = async (id: number): Promise<InstagramAutomation> => {
  const res = await fetchWithAuth(getApiUrl(`${BASE}/automations/${id}/duplicate`), {
    method: "POST",
  });
  if (!res.ok) throw await erroDaResposta(res, "Erro ao duplicar a automação");
  return (await res.json()) as InstagramAutomation;
};

export const deleteAutomation = async (id: number): Promise<void> => {
  const res = await fetchWithAuth(getApiUrl(`${BASE}/automations/${id}`), { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw await erroDaResposta(res, "Erro ao excluir");
};
