// Shared constants + normalize helpers, copied verbatim from
// packages/shared (constants.ts / utils.ts) so the Hono Worker does not
// import @repo/shared (whose barrel pulls in Node-only modules).
// These are pure functions/constants — safe on Cloudflare Workers.

export const PRIMARY_IDENTITY_KEY = "primary_identity";

export const PRIMARY_IDENTITIES = ["developer", "entrepreneur", "artist"] as const;

export type PrimaryIdentity = (typeof PRIMARY_IDENTITIES)[number];

export const PRIMARY_IDENTITY_DEFAULT: PrimaryIdentity = "developer";

export function isPrimaryIdentity(value: unknown): value is PrimaryIdentity {
  return (
    typeof value === "string" &&
    (PRIMARY_IDENTITIES as readonly string[]).includes(value)
  );
}

export function normalizePrimaryIdentity(value: unknown): PrimaryIdentity {
  if (isPrimaryIdentity(value)) return value;
  if (
    value !== null &&
    typeof value === "object" &&
    "value" in value &&
    isPrimaryIdentity((value as { value: unknown }).value)
  ) {
    return (value as { value: PrimaryIdentity }).value;
  }
  return PRIMARY_IDENTITY_DEFAULT;
}

export const SITE_PRIMARY_IDENTITIES = ["developer", "know-me"] as const;

export type SitePrimaryIdentity = (typeof SITE_PRIMARY_IDENTITIES)[number];

export const SITE_PRIMARY_IDENTITY_DEFAULT: SitePrimaryIdentity = "developer";

export function isSitePrimaryIdentity(value: unknown): value is SitePrimaryIdentity {
  return (
    typeof value === "string" &&
    (SITE_PRIMARY_IDENTITIES as readonly string[]).includes(value)
  );
}

export function normalizeSitePrimaryIdentity(value: unknown): SitePrimaryIdentity {
  const raw =
    typeof value === "string"
      ? value
      : value !== null &&
          typeof value === "object" &&
          "value" in value &&
          typeof (value as { value: unknown }).value === "string"
        ? (value as { value: string }).value
        : undefined;
  if (raw === undefined) return SITE_PRIMARY_IDENTITY_DEFAULT;
  if (isSitePrimaryIdentity(raw)) return raw;
  if (raw === "entrepreneur" || raw === "artist") return "know-me";
  return SITE_PRIMARY_IDENTITY_DEFAULT;
}

export const DESIGNATIONS_KEY = "designations";
export const DESIGNATIONS_BN_KEY = "designations_bn";
export const SITE_COPY_KEY = "site_copy";
export const SITE_COPY_BN_KEY = "site_copy_bn";
export const SITE_URL_KEY = "site_url";
export const HERO_PORTRAIT_KEY = "hero_portrait_url";

export function normalizeHeroPortraitUrl(value: unknown): string | null {
  const raw =
    typeof value === "string"
      ? value
      : value !== null &&
          typeof value === "object" &&
          "value" in value &&
          typeof (value as { value: unknown }).value === "string"
        ? (value as { value: string }).value
        : null;
  if (!raw) return null;
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

export const FAVICON_KEY = "favicon_url";

export function normalizeFaviconUrl(value: unknown): string | null {
  const raw =
    typeof value === "string"
      ? value
      : value !== null &&
          typeof value === "object" &&
          "value" in value &&
          typeof (value as { value: unknown }).value === "string"
        ? (value as { value: string }).value
        : null;
  if (!raw) return null;
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

export const SEARCH_INDEXING_KEY = "search_indexing_enabled";
export const SEARCH_INDEXING_DEFAULT = false;

export function normalizeSearchIndexing(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (
    value !== null &&
    typeof value === "object" &&
    "value" in value &&
    typeof (value as { value: unknown }).value === "boolean"
  ) {
    return (value as { value: boolean }).value;
  }
  return SEARCH_INDEXING_DEFAULT;
}

export const AVAILABILITY_KEY = "availability";

export const AVAILABILITY_DEFAULT = {
  available: false,
  badgeText: "Available for projects",
} as const;

export interface AvailabilitySetting {
  available: boolean;
  badgeText: string;
}

export function normalizeAvailability(value: unknown): AvailabilitySetting {
  const raw =
    value !== null && typeof value === "object" && "value" in value
      ? (value as { value: unknown }).value
      : value;
  const obj =
    raw !== null && typeof raw === "object"
      ? (raw as { available?: unknown; badgeText?: unknown })
      : {};
  return {
    available:
      typeof obj.available === "boolean"
        ? obj.available
        : AVAILABILITY_DEFAULT.available,
    badgeText:
      typeof obj.badgeText === "string" && obj.badgeText.trim()
        ? obj.badgeText
        : AVAILABILITY_DEFAULT.badgeText,
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
