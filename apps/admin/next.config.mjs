// Admin UI -> Hono cutover (V3 Hono completion).
//
// The admin UI calls its API ~197 times via fetch("/api/...") in ~65
// client components. Those calls stay same-origin and land on the
// catch-all proxy route (src/app/api/[...path]/route.ts), which
// forwards them to the Hono worker through the HONO_API service
// binding — so no call-site change, no CORS, and the Better Auth
// session cookie rides along (including /api/auth/*, so sign-in /
// session now go through Hono's Better Auth handler). Server actions
// use the client in src/lib/hono-client.ts (same binding).
//
// There used to be Next.js `beforeFiles` rewrites here proxying /api/*
// to the Hono `workers.dev` URL. They were REMOVED 2026-11-13: a Worker
// CANNOT fetch another Worker's `*.workers.dev` URL from inside the
// Worker (Cloudflare "error code: 1042"), so the rewrite proxy 1042s
// in production. The catch-all route + service binding replaces them.
// Do NOT re-add URL rewrites to Hono — use the proxy route.

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // pdfkit (and its fontkit dependency) must stay a runtime require:
  // Turbopack cannot bundle fontkit's ESM build (@swc/helpers mismatch).
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
