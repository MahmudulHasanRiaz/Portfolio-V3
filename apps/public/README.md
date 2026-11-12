# Portfolio-Public — public site for riaz.com.bd

Astro + Cloudflare Workers (static assets). This is **only** the public
website. The backend, admin panel, portal and database stay in the
Portfolio-V2 monorepo (Next.js, PostgreSQL, Portainer/VPS).

## Status

**Skeleton (2026-11-08).** Astro 7.4.7 + `@astrojs/cloudflare` 14.4.6 +
`@astrojs/react` 7.1.4, glass design from day one. Sections are ported from
the approved React design preview one by one — nothing here is final content.

## Strategy — hybrid live-then-static

Full plan: `ASTRO_HYBRID_PLAN.md` (Portfolio-V2 goal workspace).

- Static-first: homepage, Know Me and archives build to static HTML.
- Detail routes (`[slug]`) are on-demand (`prerender = false`): a new or
  updated post shows live instantly via the Worker fallback, then becomes
  static after the next scheduled rebuild.
- Content comes from the read-only **Public Content API** (HTTP) served by
  the Next.js backend — the Worker cannot TCP to the VPS Postgres directly.
  No static fallback content: empty means the section is omitted.

## Run

```sh
npm install
npm run dev      # local dev server
npm run build    # astro build -> dist/
npm run preview  # preview the production build
npm run check    # astro check (types)
```

## Deploy

Cloudflare Workers with static assets (`wrangler.jsonc`, `assets: ./dist`).
Deploy with `npm run deploy` (or the Cloudflare deploy hook — URL lives in
env, never in code). Custom domain `riaz.com.bd` points at the Worker;
`admin.`, `portal.` and `files.` stay on the VPS.

## Triggers — hybrid live-then-static (plan §§5–6)

The flow, end to end:

1. **Publish / update / delete in admin** → the backend calls
   `POST /api/cache/invalidate` on this Worker with the affected tags
   (e.g. `["post:123", "posts", "home:latest"]`). Only those pages purge —
   never the whole site. The next request renders live from the API.
   Auth: `Authorization: Bearer $CACHE_INVALIDATE_SECRET` (wrangler secret;
   the endpoint answers 503 until the secret is set).
2. **Debounced rebuild** → the backend also calls the Cloudflare deploy hook
   (2–5 min debounce, so a burst of edits builds once). The hook URL is a
   secret in env — never in code. After the build, the content is a static
   file and the Worker is not hit at all.
3. **Scheduled rebuild (safety net)** → every 6h + nightly 03:00 Dhaka, the
   deploy hook is called on a schedule so anything seen live becomes static
   even if a webhook was missed. (Interval is finalised at build time; the
   scheduler lives outside this repo — e.g. a cron calling the hook.)
4. **Manual rebuild** → optional admin "Rebuild public site" button (to be
   decided when the backend hook lands).

Cache rules live in `astro.config.mjs` (`routeRules`): detail pages
`maxAge 300 / swr 60`, archives `maxAge 60 / swr 300`, with per-entry tags
(`posts`, `post:<slug>`, `home:latest`) applied by the pages themselves via
`Astro.cache.set(entry)`. Draft saves trigger nothing — only publish /
update-published / unpublish / delete.

## Env

- `PUBLIC_CONTENT_API_URL` — base URL of the read-only Public Content API
  (e.g. `https://riaz.com.bd/api/public/content`). Unset = live collections
  return empty; nothing crashes.
- `PUBLIC_CONTENT_API_TOKEN` — read-only token, when the API requires one.
  Never commit tokens.
- `CACHE_INVALIDATE_SECRET` — Bearer token for `POST /api/cache/invalidate`.
  Set as a wrangler secret (`wrangler secret put CACHE_INVALIDATE_SECRET`).
  Until it is set, the endpoint answers 503 and refuses to purge.

## Structure

```
astro.config.mjs       # adapter: cloudflare(), output: 'static'
wrangler.jsonc         # assets: ./dist
src/content.config.ts  # build-time collections (empty until the port)
src/live.config.ts     # live collections — defineLiveCollection()
src/loaders/           # live loader: API client (NOT direct DB)
src/pages/             # index, know-me, archives, [slug] detail routes
src/components/        # React islands (theme toggle, globe, carousel…)
src/layouts/           # base layout + glass styles
```
