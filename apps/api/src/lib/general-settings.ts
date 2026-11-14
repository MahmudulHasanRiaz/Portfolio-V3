/* ------------------------------------------------------------------ */
/* General site settings — admin-only, edited at Settings → General.    */
/* Stored as single rows in the EXISTING generic settings table         */
/* (key/value), exactly like the other single-key settings in          */
/* routes/admin/settings/values.ts. No migration is needed: the rows    */
/* are created on first save (upsert).                                  */
/*                                                                      */
/* Keys:                                                                */
/*   "site_name"    — the site name, shown in the browser tab (default  */
/*                     page title) and og:site_name on the public site. */
/*                     Default "Mahmudul Hasan Riaz" (the public site's */
/*                     built-in name). The V2 seed's "Personal Brand    */
/*                     OS" value was a generic placeholder and is NOT   */
/*                     used as the default.                             */
/*   "site_tagline" — short tagline, used as the default meta           */
/*                     description on public pages without their own    */
/*                     description. Empty = the built-in description.   */
/*                     Deliberately a SEPARATE key from                */
/*                     "site_description": that key is the homepage SEO */
/*                     description edited at Settings → Site Copy.      */
/*   "timezone"     — default timezone for the site (display of dates   */
/*                     in the admin; the public site renders no times). */
/*                     Default "Asia/Dhaka".                            */
/*   "default_language" lives in lib/default-language.ts and is edited  */
/*                     through the SAME General page (one combined       */
/*                     GET/PUT /general endpoint), so the page needs    */
/*                     one fetch and one save for all four fields.      */
/*                                                                      */
/* The values cross to the public sites only through                    */
/* GET /api/public/settings (siteName / siteTagline), so a              */
/* dashboard-local definition is sufficient.                            */
/* ------------------------------------------------------------------ */

export const SITE_NAME_KEY = "site_name";

export const SITE_NAME_DEFAULT = "Mahmudul Hasan Riaz";

export const SITE_TAGLINE_KEY = "site_tagline";

/** Built-in tagline — the public site's default meta description. */
export const SITE_TAGLINE_DEFAULT =
  "Software Engineer, Entrepreneur and Nasheed Artist — Dhaka, Bangladesh.";

export const TIMEZONE_KEY = "timezone";

export const TIMEZONE_DEFAULT = "Asia/Dhaka";

/** Curated IANA timezones (Dhaka first — the owner's timezone). The
 *  admin General page renders this same list; keep the two in sync. */
export const TIMEZONES = [
  "Asia/Dhaka",
  "UTC",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Jakarta",
  "Australia/Sydney",
  "Pacific/Auckland",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
] as const;

export type Timezone = (typeof TIMEZONES)[number];

export function isTimezone(value: unknown): value is Timezone {
  return (
    typeof value === "string" &&
    (TIMEZONES as readonly string[]).includes(value)
  );
}

/** Accepts a raw settings-table value (string, or { value: string }) and
 *  returns a valid site name, falling back to the default. */
export function normalizeSiteName(value: unknown): string {
  const raw =
    typeof value === "string"
      ? value
      : value !== null &&
          typeof value === "object" &&
          "value" in value &&
          typeof (value as { value: unknown }).value === "string"
        ? (value as { value: string }).value
        : null;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : SITE_NAME_DEFAULT;
}

/** Accepts a raw settings-table value and returns the tagline, or null
 *  when unset/empty (the public site then uses its built-in text). */
export function normalizeSiteTagline(value: unknown): string | null {
  const raw =
    typeof value === "string"
      ? value
      : value !== null &&
          typeof value === "object" &&
          "value" in value &&
          typeof (value as { value: unknown }).value === "string"
        ? (value as { value: string }).value
        : null;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

/** Accepts a raw settings-table value and returns a valid timezone,
 *  falling back to Asia/Dhaka. */
export function normalizeTimezone(value: unknown): Timezone {
  const raw =
    typeof value === "string"
      ? value
      : value !== null &&
          typeof value === "object" &&
          "value" in value &&
          typeof (value as { value: unknown }).value === "string"
        ? (value as { value: string }).value
        : null;
  return raw && isTimezone(raw) ? raw : TIMEZONE_DEFAULT;
}
