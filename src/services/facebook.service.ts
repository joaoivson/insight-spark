import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import { erroDaResposta } from "@/services/http-error";
import type {
  FacebookAdAccount,
  FacebookIntegrationStatus,
} from "@/shared/types/campaign";

export const getFacebookStatus = async (): Promise<FacebookIntegrationStatus | null> => {
  const url = getApiUrl("/api/v1/facebook/status");
  const res = await fetchWithAuth(url);
  if (res.status === 404 || res.status === 204) return null;
  if (!res.ok) throw new Error((await res.text()) || "Erro ao buscar status do Facebook");
  return (await res.json()) as FacebookIntegrationStatus | null;
};

export const getFacebookOAuthUrl = async (redirectUri: string): Promise<string> => {
  const url = getApiUrl(`/api/v1/facebook/oauth-url?redirect_uri=${encodeURIComponent(redirectUri)}`);
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error((await res.text()) || "Erro ao gerar URL de login do Facebook");
  const data = await res.json();
  return data.url as string;
};

export const completeFacebookOAuth = async (
  code: string,
  redirectUri: string,
): Promise<FacebookIntegrationStatus> => {
  const url = getApiUrl("/api/v1/facebook/oauth/callback");
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Erro ao conectar com o Facebook");
  return (await res.json()) as FacebookIntegrationStatus;
};

/**
 * Código que o backend devolve quando o token do usuário no Facebook não vale mais
 * (expirado, senha trocada, app removido). A tela usa isso para oferecer a reconexão
 * em vez de mostrar um erro cru.
 */
export const FACEBOOK_TOKEN_INVALIDO = "facebook_token_invalido";

export const listFacebookAdAccounts = async (): Promise<FacebookAdAccount[]> => {
  const url = getApiUrl("/api/v1/facebook/ad-accounts");
  const res = await fetchWithAuth(url);
  if (!res.ok) throw await erroDaResposta(res, "Erro ao listar contas de anúncio");
  return (await res.json()) as FacebookAdAccount[];
};

export const selectFacebookAdAccount = async (
  adAccountId: string,
  adAccountName?: string | null,
): Promise<FacebookIntegrationStatus> => {
  const url = getApiUrl("/api/v1/facebook/ad-account");
  const res = await fetchWithAuth(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ad_account_id: adAccountId, ad_account_name: adAccountName ?? null }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Erro ao selecionar conta de anúncio");
  return (await res.json()) as FacebookIntegrationStatus;
};

export const selectFacebookAdAccounts = async (
  accountIds: string[],
): Promise<FacebookIntegrationStatus> => {
  const url = getApiUrl("/api/v1/facebook/ad-accounts");
  const res = await fetchWithAuth(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account_ids: accountIds }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Erro ao salvar contas de anúncio");
  return (await res.json()) as FacebookIntegrationStatus;
};

export const disconnectFacebook = async (): Promise<void> => {
  const url = getApiUrl("/api/v1/facebook");
  const res = await fetchWithAuth(url, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    throw new Error((await res.text()) || "Erro ao desconectar Facebook");
  }
};

export const triggerFacebookSync = async (): Promise<void> => {
  const url = getApiUrl("/api/v1/facebook/sync");
  const res = await fetchWithAuth(url, { method: "POST" });
  if (!res.ok) throw await erroDaResposta(res, "Erro ao iniciar sincronização do Facebook");
};

export const validateFacebookToken = async (): Promise<{
  valid: boolean;
  status: string;
  connection_state: string;
}> => {
  const url = getApiUrl("/api/v1/facebook/validate-token");
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error((await res.text()) || "Erro ao validar token Facebook");
  return res.json();
};

export const clearFacebookAdsData = async (): Promise<void> => {
  const url = getApiUrl("/api/v1/facebook/clear-ads-data");
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: true }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Erro ao limpar dados de anúncios");
};
