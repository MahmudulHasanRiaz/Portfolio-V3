export function generateCanonical(url: string, baseUrl?: string): string {
  if (baseUrl && !url.startsWith("http://") && !url.startsWith("https://")) {
    const normalizedBase = baseUrl.replace(/\/+$/, "");
    const normalizedPath = url.startsWith("/") ? url : `/${url}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  return url;
}
