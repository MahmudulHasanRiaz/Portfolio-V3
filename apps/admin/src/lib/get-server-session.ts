import { honoFetch } from "@/lib/hono-client";

// Server-side session check — validated through Hono, NOT the local
// Better Auth instance.
//
// WHY: the admin's local Better Auth instance (@repo/auth) reads the
// `ba_session` table through postgres.js (raw TCP), which CANNOT run
// on the Cloudflare Workers edge runtime. So the old implementation
// (`auth.api.getSession(...)`) always threw here, this function always
// returned null, and every server action that gates on the session
// (listContent, getContentById, …) threw "Authentication required" —
// which surfaced in the browser as the blog/projects pages crashing
// with "Minified React error #441" (a Server Components render
// failure). Hono's /api/auth/get-session reads the SAME ba_session
// table through the Neon HTTP driver (Workers-safe) and returns the
// same shape ({ session, user } or null), so this is a drop-in
// replacement. Hono's requireAuth on every admin endpoint still
// enforces auth for the actual data calls; this check is only the
// local gate the actions already had.
export type ServerSession = {
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: string;
    updatedAt: string;
  };
} | null;

export async function getServerSession(): Promise<ServerSession> {
  try {
    const session = await honoFetch<ServerSession>("/api/auth/get-session");
    return session;
  } catch {
    return null;
  }
}
