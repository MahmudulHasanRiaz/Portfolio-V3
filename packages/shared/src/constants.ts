export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  SALES_EXECUTIVE: "sales_executive",
  PROJECT_MANAGER: "project_manager",
  WRITER: "writer",
  MEDIA_MANAGER: "media_manager",
  FINANCE_MANAGER: "finance_manager",
  ARTIST_MANAGER: "artist_manager",
  MARKETER: "marketer",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  // Users
  CREATE_USER: "create_user",
  READ_USER: "read_user",
  UPDATE_USER: "update_user",
  DELETE_USER: "delete_user",
  MANAGE_USERS: "manage_users",
  // Content
  CREATE_POST: "create_post",
  READ_POST: "read_post",
  UPDATE_POST: "update_post",
  DELETE_POST: "delete_post",
  PUBLISH_POST: "publish_post",
  CREATE_PAGE: "create_page",
  READ_PAGE: "read_page",
  UPDATE_PAGE: "update_page",
  DELETE_PAGE: "delete_page",
  CREATE_SERVICE: "create_service",
  READ_SERVICE: "read_service",
  UPDATE_SERVICE: "update_service",
  DELETE_SERVICE: "delete_service",
  CREATE_PROJECT: "create_project",
  READ_PROJECT: "read_project",
  UPDATE_PROJECT: "update_project",
  DELETE_PROJECT: "delete_project",
  // CRM
  CREATE_LEAD: "create_lead",
  READ_LEAD: "read_lead",
  UPDATE_LEAD: "update_lead",
  DELETE_LEAD: "delete_lead",
  MANAGE_LEADS: "manage_leads",
  // Media
  UPLOAD_MEDIA: "upload_media",
  READ_MEDIA: "read_media",
  DELETE_MEDIA: "delete_media",
  MANAGE_MEDIA: "manage_media",
  // Finance
  READ_FINANCE: "read_finance",
  MANAGE_FINANCE: "manage_finance",
  // SEO
  MANAGE_SEO: "manage_seo",
  // Settings
  MANAGE_SETTINGS: "manage_settings",
  READ_SETTINGS: "read_settings",
  // Portal
  MANAGE_PORTAL: "manage_portal",
  // Notifications
  MANAGE_NOTIFICATIONS: "manage_notifications",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ENTITY_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const POST_STATUS = {
  DRAFT: "draft",
  REVIEW: "review",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const LEAD_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  PROPOSAL_SENT: "proposal_sent",
  NEGOTIATION: "negotiation",
  WON: "won",
  LOST: "lost",
  ARCHIVED: "archived",
} as const;

export const PIPELINE_ORDER = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
  "archived",
] as const;

export const SUBSCRIBER_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  ACTIVE: "active",
  UNSUBSCRIBED: "unsubscribed",
  BOUNCED: "bounced",
  BLOCKED: "blocked",
} as const;

export const RELEASE_TYPES = [
  "nasheed",
  "tilawat",
  "acting",
  "podcast",
  "interview",
  "documentary",
] as const;

export const EVENT_STATUS = {
  INQUIRY: "inquiry",
  NEGOTIATING: "negotiating",
  CONFIRMED: "confirmed",
  LOGISTICS_FINALIZED: "logistics_finalized",
  COMPLETED: "completed",
  DECLINED: "declined",
  CANCELLED: "cancelled",
  ARCHIVED: "archived",
} as const;

export const CURRENCIES = ["USD", "EUR", "GBP", "BDT", "SAR", "AED"] as const;

export const PAYMENT_TYPES = [
  "advance",
  "installment",
  "final",
  "full",
] as const;

export const INVOICE_STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

/* ------------------------------------------------------------------ */
/* Primary (focused) public identity — admin-only setting.             */
/* Stored as a single row in the EXISTING generic settings table        */
/* (key = "primary_identity", value = one of the three ids below).     */
/* No migration is needed. The homepage hero, primary CTA, chapter      */
/* order/highlight, nav CTA and SEO/meta derive from this value; it    */
/* is NEVER a visitor-facing control — visitors never pick an          */
/* identity (no dropdown, pills, or switcher for visitors).            */
/* ------------------------------------------------------------------ */
export const PRIMARY_IDENTITY_KEY = "primary_identity";

export const PRIMARY_IDENTITIES = ["developer", "entrepreneur", "artist"] as const;

export type PrimaryIdentity = (typeof PRIMARY_IDENTITIES)[number];

export const PRIMARY_IDENTITY_DEFAULT: PrimaryIdentity = "developer";

export const PRIMARY_IDENTITY_LABELS: Record<PrimaryIdentity, string> = {
  developer: "Software Engineer",
  entrepreneur: "Entrepreneur",
  artist: "Islamic Artist",
};

export function isPrimaryIdentity(value: unknown): value is PrimaryIdentity {
  return (
    typeof value === "string" &&
    (PRIMARY_IDENTITIES as readonly string[]).includes(value)
  );
}

/** Accepts a raw settings-table value (string, or { value: string }) and
 *  returns a valid identity, falling back to the PRD default. */
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

/* ------------------------------------------------------------------ */
/* Site primary identity — the admin setting + Astro public site.       */
/* A SEPARATE 2-option type (NOT the shared PrimaryIdentity above):     */
/* the old web app (riaz.com.bd) uses PrimaryIdentity's 3-chapter      */
/* model (developer | entrepreneur | artist) and must keep it. The     */
/* admin panel + Astro site use only these two profiles: "developer"    */
/* (Software Engineer) or "know-me" (the Know Me profile — the whole   */
/* person on one page). Stored in the SAME settings-table row (key =    */
/* PRIMARY_IDENTITY_KEY); this type is just the narrower 2-option       */
/* view of that row. A stored value outside these two normalizes to     */
/* the default via normalizeSitePrimaryIdentity (fail-safe, no          */
/* migration, no crash) — EXCEPT the legacy 3-chapter values           */
/* "entrepreneur" / "artist", which normalize to "know-me" (the whole  */
/* person on one page), NOT to "developer".                            */
/* ------------------------------------------------------------------ */
export const SITE_PRIMARY_IDENTITIES = ["developer", "know-me"] as const;

export type SitePrimaryIdentity = (typeof SITE_PRIMARY_IDENTITIES)[number];

export const SITE_PRIMARY_IDENTITY_DEFAULT: SitePrimaryIdentity = "developer";

export const SITE_PRIMARY_IDENTITY_LABELS: Record<SitePrimaryIdentity, string> = {
  developer: "Software Engineer",
  "know-me": "Know Me",
};

export function isSitePrimaryIdentity(value: unknown): value is SitePrimaryIdentity {
  return (
    typeof value === "string" &&
    (SITE_PRIMARY_IDENTITIES as readonly string[]).includes(value)
  );
}

/** Accepts a raw settings-table value (string, or { value: string }) and
 *  returns a valid site identity, falling back to the default. Legacy
 *  3-chapter values "entrepreneur" / "artist" map to "know-me" (re-audit
 *  row 14: they used to fall through to "developer", which pointed the
 *  homepage at the wrong profile). */
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

/* ------------------------------------------------------------------ */
/* Public-settings keys the Astro public site reads (D1a).              */
/* Stored in the generic settings table; the Public Content API         */
/* (getPublicSettings) reads them, the admin panel writes them.         */
/* ------------------------------------------------------------------ */

/** Designations list — jsonb array of { title, description? }. Written
 *  by the admin profile UI (D1b); the public API only reads it and
 *  defaults to [] when the key is absent. */
export const DESIGNATIONS_KEY = "designations";
/** Bangla designations — same shape as DESIGNATIONS_KEY, positional
 *  overlay by index (entry i overrides designations[i]). Separate key
 *  (not nested inside `designations`), mirroring the hero_headline /
 *  hero_headline_bn pattern. */
export const DESIGNATIONS_BN_KEY = "designations_bn";

/** Site copy — jsonb Record<string, string> (English). Section headings,
 *  archive/detail chrome, contact copy and other dictionary strings the
 *  admin can override; the Astro site overlays these over its i18n dict.
 *  Seeded later from the translation map — never seeded by the API leg. */
export const SITE_COPY_KEY = "site_copy";
/** Bangla site copy — same shape as SITE_COPY_KEY, keyed identically. */
export const SITE_COPY_BN_KEY = "site_copy_bn";

/** Canonical site URL — plain string (e.g. https://mahmudulhasanriaz.com).
 *  The Astro site falls back to its current workers.dev URL while the
 *  key is absent; setting it never changes any live domain by itself. */
export const SITE_URL_KEY = "site_url";

/* ------------------------------------------------------------------ */
/* Hero portrait — admin-only setting.                                  */
/* Stored as a single row in the EXISTING generic settings table        */
/* (key = "hero_portrait_url", value = the portrait image URL string).  */
/* No migration is needed. The URL must point at the dashboard's own    */
/* media storage (uploaded from the admin panel); the portrait is       */
/* NEVER served from a public-site repo file. Unset (no row, empty,     */
/* or non-URL value) means no portrait — the public site falls back     */
/* to its own placeholder/monogram.                                     */
/* ------------------------------------------------------------------ */
export const HERO_PORTRAIT_KEY = "hero_portrait_url";

/** Accepts a raw settings-table value (string, or { value: string }) and
 *  returns the portrait URL, or null when unset/invalid. Never throws. */
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

/* ------------------------------------------------------------------ */
/* Favicon — admin-only setting.                                        */
/* Stored as a single row in the EXISTING generic settings table        */
/* (key = "favicon_url", value = the favicon image URL string). No      */
/* migration is needed. The URL must point at the dashboard's own       */
/* media storage (uploaded from the admin panel, folder "brand"); the   */
/* public site reads it from GET /api/public/settings and renders it    */
/* as <link rel="icon">. Unset (no row, empty, or non-URL value)        */
/* means no favicon — the public site falls back to its repo            */
/* /favicon.svg.                                                        */
/* ------------------------------------------------------------------ */
export const FAVICON_KEY = "favicon_url";

/** Accepts a raw settings-table value (string, or { value: string }) and
 *  returns the favicon URL, or null when unset/invalid. Never throws. */
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

/* ------------------------------------------------------------------ */
/* Search engine indexing — admin-only setting.                        */
/* Stored as a single row in the EXISTING generic settings table        */
/* (key = "search_indexing_enabled", value = boolean). No migration    */
/* is needed. Default is OFF (fail-closed): when the row is missing   */
/* or the value is not boolean true, the public site emits noindex,    */
/* robots.txt disallows everything, and the sitemap is empty. The     */
/* owner turns it on from the dashboard only when the site is final.  */
/* ------------------------------------------------------------------ */
export const SEARCH_INDEXING_KEY = "search_indexing_enabled";

export const SEARCH_INDEXING_DEFAULT = false;

/** Strict on purpose: only a real boolean true enables indexing. */
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

/* ------------------------------------------------------------------ */
/* Availability badge — admin-only setting.                            */
/* Stored as a single row in the EXISTING generic settings table        */
/* (key = "availability", value = { available: boolean, badgeText:     */
/* string }). No migration is needed. Controls the availability badge   */
/* displayed on the public site ("Available for projects"). Default     */
/* is NOT available: when the row is missing, the badge is hidden.     */
/* ------------------------------------------------------------------ */
export const AVAILABILITY_KEY = "availability";

export const AVAILABILITY_DEFAULT = {
  available: false,
  badgeText: "Available for projects",
} as const;

export interface AvailabilitySetting {
  available: boolean;
  badgeText: string;
}

/** Accepts a raw settings-table value and returns a normalized
 *  { available, badgeText } pair, falling back to the defaults for
 *  any missing/invalid field. Never throws. */
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
