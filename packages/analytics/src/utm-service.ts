export interface UTMParams {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
}

export function extractUTMParams(url: string | URL | URLSearchParams): UTMParams {
  const params = url instanceof URLSearchParams
    ? url
    : new URL(url instanceof URL ? url : url, "http://localhost").searchParams;

  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmContent = params.get("utm_content");
  const utmTerm = params.get("utm_term");

  return {
    utmSource: utmSource || null,
    utmMedium: utmMedium || null,
    utmCampaign: utmCampaign || null,
    utmContent: utmContent || null,
    utmTerm: utmTerm || null,
  };
}

export function hasUTMParams(params: UTMParams): boolean {
  return !!(
    params.utmSource ||
    params.utmMedium ||
    params.utmCampaign ||
    params.utmContent ||
    params.utmTerm
  );
}
