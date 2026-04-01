import { getApiUrl, fetchWithAuth } from "@/core/config/api.config";

export interface TrackEventPayload {
  site_id: number;
  slug: string;
  event_type: "page_view" | "click_group";
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_adset?: string | null;
  utm_ad?: string | null;
  referrer?: string | null;
  user_agent?: string | null;
}

export interface SiteEventStats {
  site_id: number;
  page_views: number;
  click_groups: number;
}

export interface SiteEventStatsResponse {
  stats: SiteEventStats[];
}

export async function getSiteEventStats(): Promise<SiteEventStatsResponse> {
  const url = getApiUrl("/api/v1/events/stats");
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error("Erro ao carregar estatísticas de eventos");
  }
  return res.json();
}

export async function trackEvent(payload: TrackEventPayload): Promise<void> {
  try {
    const url = getApiUrl("/api/v1/events");
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // Ensures request completes even if page navigates away
    });
  } catch {
    // Silently fail — tracking should never block user experience
  }
}
