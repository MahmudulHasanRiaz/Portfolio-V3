/* ------------------------------------------------------------------ */
/* Social login (Google + GitHub) — admin-only, edited at Settings →     */
/* Social Login. Stored as ONE row in the EXISTING generic settings     */
/* table (key/value JSONB), exactly like the other settings in          */
/* routes/admin/settings/values.ts. No migration is needed: the row     */
/* is created on first save (upsert).                                  */
/*                                                                      */
/* Key:                                                                 */
/*   "social_login" — { google: {...}, github: {...} }, each            */
/*     { enabled: boolean, clientId: string, clientSecret: string }.    */
/*                                                                      */
/* SECURITY — read this before touching this file:                      */
/* - An OAuth client SECRET must be stored in a form the server can     */
/*   read back: Better Auth sends the raw secret to Google/GitHub on    */
/*   every OAuth code exchange, so hashing (like the Website            */
/*   Integration tokens' SHA-256) is impossible here. The secret       */
/*   lives in the private Neon DB only, the GET endpoint never returns  */
/*   it (only `configured` + a masked client-ID prefix), and it is      */
/*   never logged.                                                      */
/* - Social sign-in can NEVER create an account: both providers run    */
/*   with `disableImplicitSignUp: true` (see src/auth.ts), so only an  */
/*   email that already has a ba_user row (created by an admin, or by  */
/*   a portal client's setup) can sign in with Google/GitHub.          */
/* ------------------------------------------------------------------ */

import { eq } from "drizzle-orm";
import { settings } from "@repo/database/schema";
import type { ApiDb } from "../db";

export const SOCIAL_LOGIN_KEY = "social_login";

export const SOCIAL_LOGIN_GROUP = "auth";

export const SOCIAL_PROVIDERS = ["google", "github"] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDERS)[number];

export function isSocialProviderId(
  value: unknown,
): value is SocialProviderId {
  return (
    typeof value === "string" &&
    (SOCIAL_PROVIDERS as readonly string[]).includes(value)
  );
}

export interface SocialProviderConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
}

export interface SocialLoginConfig {
  google: SocialProviderConfig;
  github: SocialProviderConfig;
}

export const DEFAULT_SOCIAL_PROVIDER_CONFIG: SocialProviderConfig = {
  enabled: false,
  clientId: "",
  clientSecret: "",
};

export const DEFAULT_SOCIAL_LOGIN_CONFIG: SocialLoginConfig = {
  google: { ...DEFAULT_SOCIAL_PROVIDER_CONFIG },
  github: { ...DEFAULT_SOCIAL_PROVIDER_CONFIG },
};

/** Fresh all-disabled config (no shared nested references). */
export function freshDefaultSocialLoginConfig(): SocialLoginConfig {
  return {
    google: { ...DEFAULT_SOCIAL_PROVIDER_CONFIG },
    github: { ...DEFAULT_SOCIAL_PROVIDER_CONFIG },
  };
}

/** Max lengths enforced by the PUT schema (generous — OAuth client IDs
 *  and secrets are short opaque strings). */
export const SOCIAL_CLIENT_ID_MAX = 255;
export const SOCIAL_CLIENT_SECRET_MAX = 500;

function asConfigString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function normalizeProviderConfig(value: unknown): SocialProviderConfig {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_SOCIAL_PROVIDER_CONFIG };
  }
  const record = value as Record<string, unknown>;
  return {
    enabled: record.enabled === true,
    clientId: asConfigString(record.clientId, SOCIAL_CLIENT_ID_MAX),
    clientSecret: asConfigString(record.clientSecret, SOCIAL_CLIENT_SECRET_MAX),
  };
}

/** Accepts a raw settings-table value and returns a valid config,
 *  falling back to all-disabled for anything malformed. */
export function normalizeSocialLoginConfig(
  value: unknown,
): SocialLoginConfig {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {
      google: { ...DEFAULT_SOCIAL_PROVIDER_CONFIG },
      github: { ...DEFAULT_SOCIAL_PROVIDER_CONFIG },
    };
  }
  const record = value as Record<string, unknown>;
  return {
    google: normalizeProviderConfig(record.google),
    github: normalizeProviderConfig(record.github),
  };
}

/** A provider is usable only when it is enabled AND has both halves of
 *  its OAuth credentials. The login page only offers usable providers,
 *  and the auth instance only registers usable providers. */
export function isProviderUsable(config: SocialProviderConfig): boolean {
  return (
    config.enabled && config.clientId !== "" && config.clientSecret !== ""
  );
}

/** Providers the login page may offer, in display order. Contains
 *  provider ids only — never any credential material. */
export function getUsableSocialProviders(
  config: SocialLoginConfig,
): SocialProviderId[] {
  return SOCIAL_PROVIDERS.filter((id) => isProviderUsable(config[id]));
}

/** Masked client-ID prefix for the admin UI (same idea as the
 *  integrations tokenPrefix): enough to recognise which OAuth app is
 *  wired up, never enough to use. Null when no client ID is stored. */
export function maskClientId(clientId: string): string | null {
  if (!clientId) return null;
  if (clientId.length <= 8) return "••••••••";
  return `${clientId.slice(0, 4)}…`;
}

/** The browser-facing admin origin Better Auth uses as its baseURL
 *  (BETTER_AUTH_URL on the API worker). The OAuth callback URLs the
 *  admin pastes into the Google Cloud / GitHub OAuth app are built
 *  from it — they must be the ADMIN origin, not the API worker's,
 *  so the OAuth state + session cookies land on the admin origin
 *  through the existing /api/* proxy (see apps/api/wrangler.jsonc). */
export const ADMIN_ORIGIN = "https://admin.mahmudulhasanriaz.com";

export function socialCallbackBaseUrl(): string {
  const base = (process.env.BETTER_AUTH_URL ?? ADMIN_ORIGIN).replace(
    /\/$/,
    "",
  );
  return base === "" ? ADMIN_ORIGIN : base;
}

export function socialCallbackUrl(provider: SocialProviderId): string {
  return `${socialCallbackBaseUrl()}/api/auth/callback/${provider}`;
}

/** Read the stored config (all-disabled when the row does not exist
 *  yet). Never throws for a missing row; a DB failure propagates to
 *  the caller, which falls back to the previous auth instance. */
export async function readSocialLoginConfig(
  db: ApiDb,
): Promise<SocialLoginConfig> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, SOCIAL_LOGIN_KEY))
    .limit(1);
  return row ? normalizeSocialLoginConfig(row.value) : freshDefaultSocialLoginConfig();
}
