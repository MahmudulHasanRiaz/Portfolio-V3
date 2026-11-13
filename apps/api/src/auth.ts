// Better Auth instance for the Hono Worker.
// The admin's packages/auth instance uses postgres.js (TCP) and cannot
// run on Cloudflare Workers. This is the same Better Auth configuration
// (same tables, same model names, email+password) over the Neon HTTP
// Drizzle adapter, so it validates the SAME session cookies the admin
// issues (session tokens are random strings stored in ba_session; the
// lookup does not depend on the secret). Created lazily so the public
// routes (which never touch auth) do not pay the init cost or fail
// when DATABASE_URL is absent.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@repo/database/schema";

let cached: ReturnType<typeof createAuth> | null = null;

function createAuth() {
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
    account: { modelName: "ba_account" },
    verification: { modelName: "ba_verification" },
    emailAndPassword: { enabled: true },
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
    ],
  });
}

export function getAuth() {
  if (cached) return cached;
  cached = createAuth();
  return cached;
}

/** Validate the Better Auth session from the request headers. Returns the
 *  session (with user) or null when there is no valid session. */
export async function getSessionUser(headers: Headers) {
  try {
    const session = await getAuth().api.getSession({ headers });
    return session?.user ?? null;
  } catch {
    return null;
  }
}
