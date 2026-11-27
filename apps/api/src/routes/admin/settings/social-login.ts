// Admin settings — social login (Google + GitHub sign-in for the admin).
//
// Mounted at /api/admin/settings (see settings/index.ts), called from the
// admin UI as /api/settings/social-login. One row in the generic
// `settings` table (key "social_login", group "auth") holds both
// providers — see lib/social-login-settings.ts.
//
// SECURITY:
// - The client secret is NEVER returned by GET (only `configured` +
//   a masked client-ID prefix, like the integrations tokenPrefix) and
//   never logged. PUT treats an empty secret as "keep the stored one",
//   so the form never has to re-send a secret it cannot see; an
//   explicit `clearSecret: true` on a provider REMOVES the stored
//   secret (empty secret alone can never delete it, by design).
// - An OAuth client secret MUST be stored read-back: Better Auth sends
//   the raw secret to Google/GitHub on every code exchange, so hashing
//   (as with Website Integration tokens) is impossible here. The
//   secret lives in the private Neon DB only.
// - Enabling a provider without both halves of its credentials is
//   rejected (400) — there is no half-wired state for the login page
//   or the auth instance to trip over.
// - A save takes effect within 60 s via the auth instance's TTL cache
//   (see src/auth.ts) — no redeploy, and no cache purge is needed: the
//   login page is not a cached public page, and the public site ignores
//   the new `socialProviders` field in its settings response.
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { settings } from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  SOCIAL_CLIENT_ID_MAX,
  SOCIAL_CLIENT_SECRET_MAX,
  SOCIAL_LOGIN_GROUP,
  SOCIAL_LOGIN_KEY,
  maskClientId,
  normalizeSocialLoginConfig,
  socialCallbackUrl,
  type SocialLoginConfig,
  type SocialProviderConfig,
} from "../../../lib/social-login-settings";
import { isRecord, readJsonBody, validateBody } from "../../../lib/validate";
import type { ApiDb, Env } from "./helpers";
import { errorMessage } from "./helpers";

const app = new Hono<Env>();

const providerSchema = z.object({
  enabled: z.boolean(),
  // Empty string clears the stored client ID. A secret of "" means
  // "keep the stored secret" (the form never sees the stored value);
  // `clearSecret: true` is the ONLY way to remove a stored secret.
  // clearSecret wins over any secret value sent in the same request.
  clientId: z.string().max(SOCIAL_CLIENT_ID_MAX),
  clientSecret: z.string().max(SOCIAL_CLIENT_SECRET_MAX),
  clearSecret: z.boolean().optional(),
});

const socialLoginSchema = z.object({
  google: providerSchema,
  github: providerSchema,
});

async function findSetting(db: ApiDb, key: string) {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return row ?? null;
}

async function upsertSetting(
  db: ApiDb,
  key: string,
  value: unknown,
  group: string,
  description: string,
): Promise<void> {
  const existing = await findSetting(db, key);
  if (existing) {
    await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({ key, value, group, description });
  }
}

/** The GET/PUT response shape — sanitized: no secret ever leaves the server. */
function toResponse(config: SocialLoginConfig) {
  const provider = (cfg: SocialProviderConfig) => ({
    enabled: cfg.enabled,
    clientId: cfg.clientId,
    configured: cfg.clientSecret !== "",
    clientIdPrefix: maskClientId(cfg.clientId),
  });
  return {
    google: provider(config.google),
    github: provider(config.github),
    callbackUrls: {
      google: socialCallbackUrl("google"),
      github: socialCallbackUrl("github"),
    },
  };
}

app.get("/social-login", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const row = await findSetting(db, SOCIAL_LOGIN_KEY);
    const config = row
      ? normalizeSocialLoginConfig(row.value)
      : normalizeSocialLoginConfig(null);
    return c.json(toResponse(config));
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/social-login", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, socialLoginSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    const row = await findSetting(db, SOCIAL_LOGIN_KEY);
    const stored = row
      ? normalizeSocialLoginConfig(row.value)
      : normalizeSocialLoginConfig(null);

    const merged: SocialLoginConfig = {
      google: mergeProvider(v.data.google, stored.google),
      github: mergeProvider(v.data.github, stored.github),
    };
    // An enabled provider must be fully credentialed, otherwise the
    // login page would offer a button that can never complete.
    for (const id of ["google", "github"] as const) {
      const cfg = merged[id];
      if (cfg.enabled && (cfg.clientId === "" || cfg.clientSecret === "")) {
        const label = id === "google" ? "Google" : "GitHub";
        return c.json(
          {
            error: `${label} is enabled but has no client ID or client secret saved yet. Save the credentials first, then enable it.`,
          },
          400,
        );
      }
    }

    await upsertSetting(
      db,
      SOCIAL_LOGIN_KEY,
      merged,
      SOCIAL_LOGIN_GROUP,
      "Social login for the admin (Google + GitHub OAuth credentials + enabled flags). The client secret is stored read-back — Better Auth sends it to the provider on every code exchange.",
    );
    return c.json(toResponse(merged));
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

/** Merge one provider's submitted form over its stored row: an empty
 *  secret keeps the stored secret (the form never sees it); the
 *  client ID is taken as submitted (empty clears it). `clearSecret`
 *  removes the stored secret outright — the only way to delete one —
 *  and wins over any secret value sent in the same request. */
function mergeProvider(
  submitted: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    clearSecret?: boolean;
  },
  stored: SocialProviderConfig,
): SocialProviderConfig {
  const clientId = submitted.clientId.trim();
  if (submitted.clearSecret === true) {
    return { enabled: submitted.enabled, clientId, clientSecret: "" };
  }
  const submittedSecret = submitted.clientSecret.trim();
  return {
    enabled: submitted.enabled,
    clientId,
    clientSecret: submittedSecret !== "" ? submittedSecret : stored.clientSecret,
  };
}

export default app;
