# Build Guard — Portfolio-Public

This document exists so the build NEVER gets slow or stuck again. Read it before
touching the build, the loader, the gate, or the deploy setup. The rules below
were paid for in build minutes and in a night of stuck deploys (2026-11-10).
Whoever works on this repo — the owner, Muse, or any other AI agent — these
rules are binding. Do not work around them.

## The normal build

- A successful Cloudflare build takes **1–1.5 minutes, max 2 minutes**
  (Initializing ~4s, Cloning ~3s, Installing ~17s, Building ~1 min,
  Deploying ~seconds).
- If a build takes **more than 2–3 minutes in the Building phase, it is
  stuck** — cancel it and investigate. Do not let it run. Do not blind-retry
  (each retry burns quota and re-queues from the back).
- Build quota: **3000 build-min/month total** (account-wide). ~500 already used
  (2026-11-10). Batch deploys; never push test commits to "see if it builds";
  never retry without investigating first.

## Rule 1 — NEVER fetch the same live URL twice in one build (PR #38)

- During `astro build` prerender, every live API fetch MUST be memoised per
  build: each distinct URL is fetched ONCE, and repeat callers share the
  single in-flight/resolved promise.
- The cache lives in `src/loaders/public-content.ts` (`fetchJson` → per-build
  `Map<string, Promise<unknown>>`, active only during production prerender).
  **Do not remove it. Do not bypass it. Do not reintroduce per-page
  fetching.**
- What happened when this was violated (2026-11-10, build #21faeab0): the
  loader had no cross-page memoisation, so 58 pages made **204 live fetches
  for only 31 distinct URLs** (platforms 64×, projects 26×, releases 20×…).
  At ~1–3.6s per API call, the build took **7.5 minutes** in the Building
  phase and had to be cancelled. After the fix (PR #38): 31 fetches, build
  **1m 23s**.
- If you add a new live collection or a new per-page live call, route it
  through the memoised `fetchJson`. Count the fetches in a local build
  before pushing — if the count is far above the number of distinct URLs,
  you have reintroduced the bug.

## Rule 2 — NEVER close the live-build gate (PUBLIC_CONTENT_LIVE_BUILD=1)

- The gate (`isLiveFetchAllowed` in `src/loaders/public-content.ts`) MUST stay
  open at build time: `PUBLIC_CONTENT_LIVE_BUILD=1` is set as a Cloudflare
  Build Variable AND in `wrangler.jsonc` vars.
- Closing it regresses the /bn/ hero + services to English (they are baked at
  build time from the live fetch). This was the Run #45 fix — do not undo it.
- The gate exists because the build machine often cannot reach the API within
  the 8s timeout; the gate + the memoisation (Rule 1) together make the build
  both fast AND correct. Do not "simplify" by removing the gate or the
  timeout.

## Rule 3 — NEVER remove the 8s fetch timeout

- `fetchJson` uses `AbortSignal.timeout(8000)`. A hanging fetch (TLS/network
  stall) used to stall the whole build for 7+ minutes. The timeout bounds it.
  Callers already treat a failed fetch as "use build-time rows", so a timeout
  is safe. Do not remove or raise it without a measured reason.

## Rule 4 — prerenderEnvironment MUST stay "node" (PR #19)

- `astro.config.mjs` sets `prerenderEnvironment: "node"` on the Cloudflare
  adapter. Do NOT flip it back to `"workerd"` (the adapter default).
- Under `"workerd"`, `astro build` prerenders inside a workerd preview server
  where `navigator.userAgent` IS `"Cloudflare-Workers"` — the gate opens
  wrongly, every page makes 2–4 live fetches, each hangs the full 8s timeout,
  and the build takes ~20–30 min then FAILS. There is no in-workerd signal
  that separates prerender from a real request.

## Rule 5 — Stuck in Queued/Initializing = GitHub connection, NOT code

- If a build sits in "Queued" or "Initializing build environment..." for
  more than ~2 min and never reaches Cloning, the code has not run at all —
  it is the Cloudflare ↔ GitHub integration, not the repo.
- Do NOT push a test/fix commit (a new commit cannot fix a broken GitHub App
  connection, and "Disable builds" is ON so pushes never trigger builds
  anyway). Do NOT blind-retry.
- Fix: GitHub → Settings → Applications → Cloudflare Pages (or "Cloudflare
  Workers and Pages") → Configure → check the Portfolio-Public repo is in the
  access list; if in doubt, Uninstall, then re-authorize from the Cloudflare
  dashboard (Worker → Settings → Build → connect GitHub). Then trigger ONE
  deploy via the GitHub Action and watch it pass Initializing → Cloning.
- The tell-tale sign: the dashboard red banner "Error fetching GitHub User or
  Organization details" PLUS a build stuck at Initializing with no clone.
  That combination is a broken Git installation (Cloudflare docs: Debugging
  Pages).
- Safety: in the Cloudflare dashboard, do NOT press "Disconnect" on the
  project — only uninstall the GitHub app, then re-authorize from
  Settings → Build. Disconnecting could remove the project link itself.

## Rule 6 — Deploy deliberately, verify live

- "Disable builds" is ON; pushes NEVER trigger builds. Deploy only via the
  GitHub Action "Deploy to Cloudflare" (workflow_dispatch) — one trigger per
  batch, then verify live.
- Action success ≠ deploy success (it only means the hook was accepted).
  Always verify the Cloudflare build AND the live site. Verify by changed
  HTML/render, not by markers alone.
- After a deploy, the live check is: nav "Releases" (not "Nasheed"), /bn/
  hero + services in Bangla, dark-mode logos white. If the build took more
  than 2 min, something regressed — check Rules 1–5 before retrying.

## Rule 7 — The site is LIVE (server output, 2026-11-12)

- `output: "server"` (astro.config.mjs). EVERY page renders live at
  request time in the Worker from the Public Content API. There is no
  prerendered HTML anymore. This supersedes the hybrid live-then-static
  plan (ASTRO_HYBRID_PLAN.md) — do not reintroduce prerendering,
  `getStaticPaths`, or build-time API calls without re-checking the
  whole live design first.
- Why (the failure class this kills): rebuilds #54/#55 (2026-11-12)
  were "successful" builds that silently rendered STALE static rows —
  the build-time live fetch hung 8 s × 5 collections and every
  collection fell back to static. The live site showed 4 projects
  instead of 10 and the old EcoMate text for hours, while every build
  reported Success. With server output there IS no build-time fetch,
  so this failure class cannot recur. The build is hermetic: it must
  complete in well under 1 minute with zero live API calls (verify:
  no "Public Content API unreachable" lines in the build log at all —
  those warnings now only ever appear at REQUEST time in the Worker).
- Critical CSS: `build.inlineStylesheets: "always"` inlines the full
  built stylesheet (~64 kB minified) into every page at render time.
  The old build-time critters step (scripts/inline-critical.mjs) is
  deleted — it had no HTML to process in server mode. Do not re-add a
  build-time inliner; do not switch inlineStylesheets back to "auto"
  (the 64 kB sheet would go back to a render-blocking external link
  and PageSpeed would drop).
- Cache policy (astro.config.mjs routeRules + src/middleware.ts):
  ALL content pages fresh 3600 s (1 h) / SWR 300 s. The long TTL is
  what makes repeat visits edge hits instead of ~5 s cold Worker
  renders (measured 2026-11-12: homepage TTFB 4.87 s plain, 5.80 s
  fresh — a cold miss pays the sequential live-API fetches, and low
  traffic + a short TTL meant most visits WERE cold misses). Freshness
  comes from the tag purge (Rule 8), not from a short TTL. If a page
  ever serves `no-store`, a route rule is missing (the middleware is
  the backstop — read it).
- Runtime token: the Worker fetch needs PUBLIC_CONTENT_API_TOKEN as a
  Cloudflare runtime secret (dashboard). With no token the API 401s
  and pages render the static fallback — never a 500. Never commit a
  token; never put one in wrangler.jsonc vars.
- After a deploy, the live check is now content, not markers: /projects/
  shows 10, /projects/ecomate/ shows the new EcoMate headings, and an
  admin edit appears live within seconds (tag purge, Rule 8) — NO rebuild
  needed. If an edit does not appear, check the Worker log for the
  fallback warning first (it names the collection), then the token, then
  the admin API.

## Rule 8 — Long TTL + instant tag purge (2026-11-12)

- The 1 h TTL (Rule 7) is safe ONLY because the V2 admin purges the
  affected cache tags on every content save. The two halves live in
  different repos — if either half is removed, the other becomes a
  stale-content bug. Never raise the TTLs and never drop the purge
  without the other half in the same change.
- How the purge works (no Cloudflare API token, no zone ID needed):
  every content response carries `Cache-Tag` headers from the
  route-rule tags in astro.config.mjs (posts / projects / case-studies /
  ventures / releases / home — the homepage carries all of them) plus an
  auto path tag. POST /api/cache/invalidate calls Astro's cache API,
  which calls the Workers Cache purge-by-tag. The next request after a
  purge re-renders live from the Public Content API.
- Endpoint auth: `POST /api/cache/invalidate` requires
  `Authorization: Bearer <CACHE_INVALIDATE_SECRET>`. The secret is a
  Cloudflare dashboard secret (Production) on this Worker; the V2 admin
  sends the SAME value from its own env. Until the secret is set, the
  endpoint answers 503 and nothing is purged — the site keeps working,
  pages just stay cached up to the 1 h TTL. Never commit the secret;
  never put it in wrangler.jsonc vars.
- Failure modes (all fail-safe, never a 500 on a content page): a
  failed or missed purge leaves pages stale for at most the 1 h TTL;
  a missing/ wrong secret on the V2 side means purges 503/401 and the
  same 1 h bound; a missing token for the content API still renders the
  static fallback. If an admin edit does not show live within seconds,
  check (1) the admin log for the purge warning, (2) that
  CACHE_INVALIDATE_SECRET matches on both sides, (3) that the V2
  PUBLIC_SITE_URL points at this Worker.
- Known gap: release/venture SUB-resources (platforms, videos, lyrics,
  timeline, media, categories) do not purge yet — their edits go stale
  at most 1 h. Same for the robots/sitemap toggle (cached 3600 s in
  their own endpoints, not tag-purged). Do not "fix" this by shortening
  the TTL; wire the purge at those save paths instead.

## Rule 8 — Archive filters are ONE shared component (2026-11-12)

- All archive filter rows (projects, posts, ventures, releases — EN +
  BN) are `src/components/ArchiveFilter.astro`. Do NOT add a per-page
  chip row or a per-page filter script again: the old pattern (every
  tag as a chip in one wrapping row) reached 18 chips / 6 rows on
  /projects/ and only gets worse as categories grow.
- The component caps the visible row ("All" + top 5 by count) and puts
  every option, with counts, in a "More" dropdown; 6 or fewer options
  render as plain chips with no menu. Filtering stays client-side, no
  framework, one inline script inside the component (three match
  modes: card `.tag` text, card `data-tags`, card `data-type`).
- Case studies has NO filter (one item) — leave it alone.

## If you break one of these rules

- Revert the single-purpose commit/PR that broke it. Every change on this
  repo is a single-purpose branch/commit that reverts cleanly (rollback rule).
  Do not bundle a risky change with other work.
