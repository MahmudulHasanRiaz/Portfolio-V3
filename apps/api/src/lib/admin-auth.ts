// Shared guard for the admin CRUD routes.
// Every admin route requires a valid Better Auth session (the same
// session cookie the admin UI uses). The Next.js admin relied on
// middleware cookie-presence for 14 routes that have NO in-body auth;
// Hono has no such middleware, so every admin route must call this
// explicitly. Returns the session user, or null when unauthenticated.
import type { Context } from "hono";
import { getSessionUser } from "../auth";

export async function requireAuth(c: Context) {
  const user = await getSessionUser(c.req.raw.headers);
  return user;
}

/** JSON error shape the admin UI expects on auth failure. */
export function unauthorized() {
  return { error: "Unauthorized" };
}
