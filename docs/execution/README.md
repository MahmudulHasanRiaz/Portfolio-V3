# Execution docs — historical note

The documents in this folder are **pre-V3 planning and phase reports**.
They describe the app as `apps/web` (Next.js, SSR) + `apps/dashboard`
(Next.js + TanStack Router) — neither of those apps exists.

The real apps are:

- `apps/public` + `apps/marketplace` (Astro) — the public sites
- `apps/admin` (Next.js) — the admin UI
- `apps/api` (Hono, Cloudflare Worker) — the single backend

These files are kept for historical context only. Do not treat them as
the current architecture; see `apps/api/src/ROUTES.md` for the live
Hono route map and `docs/MARKETPLACE.md` for the marketplace copy.
