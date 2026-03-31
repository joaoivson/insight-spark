export interface UtmParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_adset: string | null;
  utm_ad: string | null;
}

export function parseUtmParams(): UtmParams {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_adset: params.get("utm_adset"),
    utm_ad: params.get("utm_ad"),
  };
}
