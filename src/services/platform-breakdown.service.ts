import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";
import type { PlatformBreakdown } from "@/shared/types/platform-breakdown";

/**
 * Gasto/cliques/ROAS por plataforma de veiculação (Instagram vs Facebook).
 *
 * Vem da Marketing API (rota de campanhas), não da automação do Instagram —
 * são integrações diferentes, com tokens diferentes.
 */
export const getPlatformBreakdown = async (
  startDate?: string,
  endDate?: string,
): Promise<PlatformBreakdown> => {
  const qs = new URLSearchParams();
  if (startDate) qs.set("start_date", startDate);
  if (endDate) qs.set("end_date", endDate);
  const sufixo = qs.toString() ? `?${qs.toString()}` : "";

  const res = await fetchWithAuth(getApiUrl(`/api/v1/campaigns/platform-breakdown${sufixo}`));
  if (!res.ok) throw new Error((await res.text()) || "Erro ao carregar o resumo por plataforma");
  return (await res.json()) as PlatformBreakdown;
};
