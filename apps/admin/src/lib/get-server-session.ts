import { auth } from "@repo/auth/server";
import { headers } from "next/headers";

// Server-side session check (Hono cutover: NO code change needed).
//
// This validates the Better Auth session cookie against the shared
// `ba_session` table in Neon — session tokens are random strings stored
// in that table, so the lookup does not depend on which worker issued
// the cookie. The Hono worker's Better Auth handler (/api/auth/*, now
// reached via the next.config.mjs rewrite) reads and writes the SAME
// table, so a session created by Hono validates here and vice versa.
// Both workers must keep the same DATABASE_URL and BETTER_AUTH_SECRET;
// do NOT regenerate the secret. See apps/api/src/auth.ts.
export async function getServerSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch {
    return null;
  }
}
