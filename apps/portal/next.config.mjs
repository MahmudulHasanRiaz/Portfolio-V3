// Portal UI -> Hono (Phase 5 port).
//
// The portal UI calls its API via fetch("/api/...") in the pages. Those
// calls stay same-origin and land on the catch-all proxy route
// (src/app/api/[...path]/route.ts), which forwards them to the Hono
// worker through the HONO_API service binding — so no call-site change,
// no CORS, and the Better Auth session cookie rides along (including
// /api/auth/*, so sign-in / session now go through Hono's Better Auth
// handler). The middleware session check (src/middleware.ts) uses the
// same binding.
//
// There are no Next.js rewrites to Hono here, and there must never be:
// a Worker CANNOT fetch another Worker's `*.workers.dev` URL from inside
// the Worker (Cloudflare "error code: 1042"), so a rewrite proxy would
// 1042 in production. The catch-all route + service binding replaces it.
//
// NOTE: this file must exist — `opennextjs-cloudflare build` errors
// ("next.config.js not found") without a Next config in the app dir.

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
