// Better Auth instance for the Hono Worker.
// The admin's packages/auth instance uses postgres.js (TCP) and cannot
// run on Cloudflare Workers. This is the same Better Auth configuration
// (same tables, same model names, email+password) over the Neon HTTP
// Drizzle adapter, so it validates the SAME session cookies the admin
// issues (session tokens are random strings stored in ba_session; the
// lookup does not depend on the secret). Created lazily so the public
// routes (which never touch auth) do not pay the init cost or fail
// when DATABASE_URL is absent.
//
// SOCIAL LOGIN (Google + GitHub) — the credentials live in Settings
// (Settings → Social Login, settings-table key "social_login"), NOT in
// env vars, so an admin can wire up OAuth without a redeploy. Better
// Auth's socialProviders are fixed at instance creation, so getAuth()
// rebuilds the instance when its cached social config is older than
// SOCIAL_CONFIG_TTL_MS (60 s). The TTL is the whole cache-bust story:
//   - a save in Settings takes effect within 60 s on every isolate,
//     with no redeploy and no extra DB read on the hot path (session
//     validation only compares a timestamp while the cache is fresh);
//   - a settings read failure NEVER breaks auth: the previous instance
//     is kept, and a first build with no readable config falls back to
//     email+password only;
//   - concurrent callers during a rebuild share one in-flight rebuild
//     (the `rebuilding` promise) instead of each building an instance.
// A rebuild mid-OAuth-flow is safe: all flow state lives in cookies
// and the ba_* tables, and the secret never changes, so the new
// instance validates the same state the old one issued.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@repo/database/schema";
import { getApiDb } from "./db";
import {
  freshDefaultSocialLoginConfig,
  isProviderUsable,
  readSocialLoginConfig,
  type SocialLoginConfig,
} from "./lib/social-login-settings";

let cached: ReturnType<typeof createAuth> | null = null;
let cachedAt = 0;
let rebuilding: Promise<ReturnType<typeof createAuth>> | null = null;

/** Social config is re-read at most once a minute per isolate. */
const SOCIAL_CONFIG_TTL_MS = 60_000;

function createAuth(social: SocialLoginConfig) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const db = drizzle(neon(connectionString), { schema });
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        ba_user: schema.baUser,
        ba_session: schema.baSession,
        ba_account: schema.baAccount,
        ba_verification: schema.baVerification,
      },
    }),
    user: { modelName: "ba_user" },
    session: { modelName: "ba_session" },
    account: {
      modelName: "ba_account",
      // Implicit account linking (a Google/GitHub identity signing in
      // with the same email as an existing local user links into that
      // user instead of creating a second one):
      // - trustedProviders: Google/GitHub prove email ownership, so
      //   their email is trusted as the link key.
      // - requireLocalEmailVerified: false — admin users are created
      //   via email+password, which leaves ba_user.emailVerified
      //   false, so the default (true) would refuse every link and
      //   social sign-in could never work for an existing admin. This
      //   is safe here BECAUSE disableImplicitSignUp (above) means no
      //   account can be created through social at all: the takeover
      //   the gate guards against (an attacker pre-registering a
      //   victim's email, then having the victim's OAuth identity
      //   linked into the attacker-owned row) needs an attacker-owned
      //   row, and the only way to get a row is an admin creating it
      //   or a portal client's email-verified setup. NOTE: this flag
      //   is deprecated in better-auth 1.7.x and the gate becomes
      //   unconditional in a later minor — on that upgrade, re-test
      //   social linking; the durable fix then is to set
      //   emailVerified=true when admin users are created. A first
      //   successful social sign-in already flips the local row to
      //   emailVerified=true (better-auth does that itself when the
      //   IdP reports a verified email), so the exposure shrinks with
      //   every social sign-in.
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github"],
        requireLocalEmailVerified: false,
      },
    },
    verification: { modelName: "ba_verification" },
    emailAndPassword: { enabled: true },
    // Only providers that are enabled AND fully credentialed in
    // Settings are registered. An unconfigured provider is not
    // offered on the login page and its /sign-in/social endpoint
    // answers "provider not found" — there is no half-wired state.
    socialProviders: {
      ...(isProviderUsable(social.google)
        ? {
            google: {
              clientId: social.google.clientId,
              clientSecret: social.google.clientSecret,
              // NO self-registration through social: a Google/GitHub
              // sign-in only works for an email that ALREADY has a
              // ba_user row (created by an admin, or by a portal
              // client's setup). Anyone else gets "signup disabled"
              // on the callback and no account is created.
              disableImplicitSignUp: true,
            },
          }
        : {}),
      ...(isProviderUsable(social.github)
        ? {
            github: {
              clientId: social.github.clientId,
              clientSecret: social.github.clientSecret,
              disableImplicitSignUp: true,
            },
          }
        : {}),
    },
    // OAuth failures (unknown account, cancelled at the provider,
    // bad code, …) redirect back to the admin login page with
    // ?error=<code> instead of the default /error page, which does
    // not exist in the admin app. The login form maps the codes to
    // friendly messages and never surfaces the raw code text.
    onAPIError: {
      errorURL: "/auth/login",
    },
    // Mirror the admin's databaseHooks (packages/auth/src/auth.ts):
    // after a ba_user row is created, also create the internal users
    // record (bridged by email) so role-gated admin features work.
    // Unlike the admin instance, this uses the Neon HTTP drizzle db
    // already in scope — postgres.js (TCP) cannot run on Workers.
    // The insert is best-effort: a DB hiccup must not break sign-up,
    // so errors are logged and swallowed.
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              await db
                .insert(schema.users)
                .values({
                  email: user.email,
                  name: user.name ?? null,
                  isActive: true,
                })
                .onConflictDoNothing({ target: schema.users.email });
            } catch (error) {
              console.error(
                "[auth] failed to create internal users record",
                error,
              );
            }
          },
        },
      },
    },
    secret: process.env.BETTER_AUTH_SECRET,
    // Trusted origins for Better Auth's Origin check on non-GET
    // /api/auth/* calls (2026-11-13, admin cutover). The browser signs
    // in from the admin worker, so its Origin is the ADMIN origin —
    // not Hono's own baseURL — and Better Auth rejects it with 403
    // INVALID_ORIGIN unless it is listed here. The admin reaches Hono
    // through the same-origin /api/* proxy (src/app/api/[...path]/),
    // but the proxy forwards the browser's Origin header unchanged,
    // so Hono still sees the admin origin. Without this, real
    // browser sign-in 403s even though curl (no Origin header) works.
    trustedOrigins: [
      "https://portfolio-v3-admin.riaaz.workers.dev",
      "https://portfolio-v3-public.riaaz.workers.dev",
      "https://portfolio-v3-portal.riaaz.workers.dev",
    ],
  });
}

/** Read the Settings-stored social config. Throws on a DB failure —
 *  the caller keeps the previous instance in that case, so auth never
 *  goes down (and social login is never silently dropped) because a
 *  settings read hiccuped. */
async function loadSocialConfig(): Promise<SocialLoginConfig> {
  return readSocialLoginConfig(getApiDb());
}

/** The Better Auth instance, rebuilt at most once a minute so a
 *  Settings save takes effect without a redeploy (see the header
 *  comment). Always await this — it is async by design. */
export async function getAuth() {
  const now = Date.now();
  if (cached && now - cachedAt < SOCIAL_CONFIG_TTL_MS) return cached;
  if (rebuilding) return rebuilding;
  rebuilding = (async () => {
    try {
      const social = await loadSocialConfig();
      cached = createAuth(social);
    } catch (error) {
      // Transient DB failure: keep the previous instance (and its
      // social providers) and back off for another TTL instead of
      // rebuilding email-only and dropping social login mid-day.
      // Only a first build with no readable config falls back to
      // email+password only.
      console.error(
        "[auth] failed to reload social login config, keeping previous instance:",
        error,
      );
      if (!cached) cached = createAuth(freshDefaultSocialLoginConfig());
    }
    cachedAt = Date.now();
    return cached;
  })();
  try {
    return await rebuilding;
  } finally {
    rebuilding = null;
  }
}

/** Validate the Better Auth session from the request headers. Returns the
 *  session (with user) or null when there is no valid session. */
export async function getSessionUser(headers: Headers) {
  try {
    const session = await (await getAuth()).api.getSession({ headers });
    return session?.user ?? null;
  } catch {
    return null;
  }
}
