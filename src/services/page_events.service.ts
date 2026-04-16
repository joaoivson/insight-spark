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
  preview?: boolean;
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

export function trackEvent(payload: TrackEventPayload): void {
  const url = getApiUrl("/api/v1/events");
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) {
        return;
      }
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // swallow — tracking must never block UX
    });
  } catch {
    // swallow — tracking must never block UX
  }
}
