import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";

export type ShopeeStatus = {
  id: number;
  user_id: number;
  app_id: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const getShopeeStatus = async (): Promise<ShopeeStatus | null> => {
  const url = getApiUrl("/api/v1/shopee/credentials");
  const res = await fetchWithAuth(url);
  if (res.status === 404 || res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao buscar status da integração Shopee");
  }
  const data = await res.json();
  return data as ShopeeStatus | null;
};

export const saveShopeeCredentials = async (
  appId: string,
  password: string,
): Promise<ShopeeStatus> => {
  const url = getApiUrl("/api/v1/shopee/credentials");
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro ao salvar credenciais Shopee");
  }
  return (await res.json()) as ShopeeStatus;
};

export const deleteShopeeCredentials = async (): Promise<void> => {
  const url = getApiUrl("/api/v1/shopee/credentials");
  const res = await fetchWithAuth(url, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(text || "Erro ao desconectar integração Shopee");
  }
};

export const triggerManualSync = async (days: number): Promise<void> => {
  // Backend develop: POST /api/v1/shopee/sync/manual?period=7|14|30|60|90
  const url = getApiUrl(`/api/v1/shopee/sync/manual?period=${days}`);
  const res = await fetchWithAuth(url, { method: "POST" });
  if (!res.ok && res.status !== 202) {
    const text = await res.text();
    throw new Error(text || "Erro ao iniciar sincronização Shopee");
  }
};
