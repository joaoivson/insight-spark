import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";

/**
 * Converte uma URL de produto Shopee em um short link de afiliado.
 *
 * POST /api/v1/shopee/short-link
 * Body: { originUrl: string, subId?: string }   (camelCase — bate com o schema do backend)
 * Retorno: { shortLink: string }
 *
 * Em caso de erro (!res.ok), lança Error com o `detail` retornado pelo
 * backend (formato padrão do FastAPI: { detail: "..." }).
 */
export async function convertShopeeLink(payload: {
  originUrl: string;
  subId?: string;
}): Promise<{ shortLink: string }> {
  const url = getApiUrl("/api/v1/shopee/short-link");

  const body: { originUrl: string; subId?: string } = {
    originUrl: payload.originUrl,
  };
  if (payload.subId) body.subId = payload.subId;

  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // FastAPI devolve { detail: "..." }. Extrai o detail; cai num fallback
    // legivel se o corpo nao for JSON ou nao tiver detail.
    let detail = "";
    try {
      const data = await res.clone().json();
      if (typeof data?.detail === "string") {
        detail = data.detail;
      } else if (Array.isArray(data?.detail)) {
        // erros de validacao do FastAPI vem como lista de objetos
        detail = data.detail
          .map((d: { msg?: string }) => d?.msg)
          .filter(Boolean)
          .join(", ");
      }
    } catch {
      /* corpo nao-JSON */
    }
    if (!detail) {
      detail = (await res.text().catch(() => "")) || "Erro ao gerar link de afiliado";
    }
    throw new Error(detail);
  }

  const data = await res.json();
  return { shortLink: data.shortLink ?? data.short_link } as { shortLink: string };
}
