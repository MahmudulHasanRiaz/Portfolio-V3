/* ------------------------------------------------------------------ */
/* Default public-site language — admin-only setting.                  */
/* Stored as a single row in the EXISTING generic settings table        */
/* (key = "default_language", value = one of the three ids below).      */
/* No migration is needed.                                              */
/*                                                                      */
/* Three options, exactly like the theme (light / dark / system):       */
/*   "en"     — the site defaults to English.                           */
/*   "bn"     — the site defaults to Bangla.                            */
/*   "system" — no fixed default: the site auto-detects the visitor's   */
/*              phone/browser language (Accept-Language /                */
/*              navigator.language); a Bangla device defaults to        */
/*              Bangla, otherwise English.                              */
/* A visitor's MANUAL switch always wins and is remembered — the admin  */
/* default / system detection must never override an explicit choice.   */
/* That detection + redirect behaviour lives client-side in the Astro   */
/* public site; this setting is only the admin-configured default the   */
/* API exposes. The Astro site must NEVER hardcode it.                  */
/*                                                                      */
/* Dashboard-local on purpose: packages/shared/src/constants.ts is      */
/* owned by the portrait-from-admin round (PR #75) and must not be      */
/* edited here. The value crosses to the Astro site only through        */
/* GET /api/public/settings, so a dashboard-local definition is         */
/* sufficient; move it to @repo/shared if another app ever needs it.    */
/* ------------------------------------------------------------------ */

export const DEFAULT_LANGUAGE_KEY = "default_language";

export const DEFAULT_LANGUAGES = ["en", "bn", "system"] as const;

export type DefaultLanguage = (typeof DEFAULT_LANGUAGES)[number];

export const DEFAULT_LANGUAGE_DEFAULT: DefaultLanguage = "en";

export const DEFAULT_LANGUAGE_LABELS: Record<DefaultLanguage, string> = {
  en: "English",
  bn: "Bangla",
  system: "System (auto-detect)",
};

/** Short descriptions shown next to each radio in the admin panel. */
export const DEFAULT_LANGUAGE_DESCRIPTIONS: Record<DefaultLanguage, string> = {
  en: "The public site opens in English unless the visitor switches language.",
  bn: "The public site opens in Bangla unless the visitor switches language.",
  system:
    "No fixed default — the site follows the visitor's phone/browser language (Bangla device → Bangla, otherwise English). A visitor's manual switch always wins and is remembered.",
};

export function isDefaultLanguage(value: unknown): value is DefaultLanguage {
  return (
    typeof value === "string" &&
    (DEFAULT_LANGUAGES as readonly string[]).includes(value)
  );
}

/** Accepts a raw settings-table value (string, or { value: string }) and
 *  returns a valid default language, falling back to "en". */
export function normalizeDefaultLanguage(value: unknown): DefaultLanguage {
  if (isDefaultLanguage(value)) return value;
  if (
    value !== null &&
    typeof value === "object" &&
    "value" in value &&
    isDefaultLanguage((value as { value: unknown }).value)
  ) {
    return (value as { value: DefaultLanguage }).value;
  }
  return DEFAULT_LANGUAGE_DEFAULT;
}
