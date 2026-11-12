// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import preact from "@astrojs/preact";

// Public site for riaz.com.bd — Astro + Cloudflare Workers, LIVE
// (on-demand SSR, 2026-11-12 — supersedes the hybrid live-then-static
// plan ASTRO_HYBRID_PLAN.md §§2–6):
//   - EVERY page renders live at request time in the Worker: the
//     detail pages, the archives, the homepage, Know Me, Platforms.
//     There is no prerendered HTML anymore, so a build can never ship
//     stale content — the failure that bit rebuilds #54/#55 (build-time
//     live fetches hung 8s × 5 collections, every build silently fell
//     back to static rows while reporting "Success").
//   - Live content comes from the read-only Public Content API (HTTP)
//     via the live loader in src/loaders/ — the Worker cannot TCP to
//     Postgres. The request-time token comes from the Worker runtime
//     env (PUBLIC_CONTENT_API_TOKEN, Cloudflare dashboard secret —
//     never in this repo). With no token the API 401s and every page
//     still renders from the build-time rows (fail-safe, never a 500).
//   - Route caching below keeps live pages fast: long fresh TTLs (1 h)
//     + stale-while-revalidate, so repeat visits are edge hits (~0.1 s)
//     instead of cold Worker renders (~5 s on a cold miss — measured
//     2026-11-12). An admin save shows up INSTANTLY, not within the TTL:
//     the V2 admin POSTs the affected tags to POST /api/cache/invalidate
//     on every content save (see that endpoint + docs/BUILD_GUARD.md
//     Rule 8). A long TTL is safe ONLY because that purge is wired —
//     do not raise these values further, and never remove the purge
//     call, without re-checking the whole live design.
//   - No build-time live fetching exists anymore: the build is hermetic
//     (see docs/BUILD_GUARD.md). Do NOT reintroduce prerendering or
//     build-time API calls without re-checking the whole live design.
export default defineConfig({
	output: "server",
	// Critical CSS (PageSpeed): with no prerendered HTML the old
	// build-time critters step (scripts/inline-critical.mjs, deleted
	// with this change) has nothing to process. Instead Astro inlines
	// the full built stylesheet (~64 kB minified, @font-face included)
	// into every page's <head> at render time — no render-blocking
	// stylesheet request at all, and the [data-theme] variable blocks
	// are present, so the View Transitions theme bug (a page running
	// on critical CSS only could not override the system preference)
	// stays fixed. The inlined bytes are edge-cached with the HTML,
	// so repeat visits pay nothing extra.
	build: {
		inlineStylesheets: "always",
	},
	// No prerendering happens in server mode, so prerenderEnvironment
	// is inert here — kept only so the adapter config stays familiar.
	// (History: with output "static" it had to be "node", never
	// "workerd", or the loader gate opened during prerender and every
	// page paid 8s API timeouts — see the loader's isLiveFetchAllowed
	// comment. That failure class is gone with server output.)
	adapter: cloudflare({ prerenderEnvironment: "node" }),
	// Preact (not React) for the islands — the React 19 runtime was
	// 212KB raw / 64.7KiB transfer with ~95KB unused (PageSpeed +
	// SpeedVitals code coverage, 2026-11-10). Preact is ~3KB and covers
	// the same hooks API the islands use (useState/useEffect/useRef/
	// useCallback/useMemo) via preact/hooks; `compat: true` enables
	// preact/compat so React-component libraries (lucide-react) keep
	// working — their `react` imports resolve to preact/compat (see
	// package.json `overrides`). Island source imports preact directly
	// (preact/hooks + preact/compat for event types); no island uses
	// React 19-only APIs, portals, context or Suspense. No visual or
	// behavioural change — same islands, same client:* directives.
	integrations: [preact({ compat: true })],
	site: "https://portfolio-public.riaaz.workers.dev",

	// Cloudflare edge cache provider — emits Cloudflare-CDN-Cache-Control
	// + Cache-Tag headers so the edge caches live pages and purges by tag.
	cache: {
		provider: {
			name: "cloudflare",
			entrypoint: "@astrojs/cloudflare/cache/provider",
		},
	},

	// Route caching. ALL content pages: fresh 1 hour (3600 s), then serve
	// stale while revalidating for 5 min (300 s). The long TTL is what
	// makes repeat visits fast (edge hits instead of ~5 s cold Worker
	// renders); freshness comes from the tag purge, not from a short
	// TTL — the V2 admin POSTs the affected tags to
	// POST /api/cache/invalidate on every content save, so an edit
	// appears live within seconds (see docs/BUILD_GUARD.md Rule 8).
	// If a purge ever fails or is missed, the worst case is a page up
	// to 1 h stale — never a 500, never a broken page. The homepage
	// aggregates every collection, so it carries all content tags —
	// any content purge refreshes it. src/middleware.ts mirrors these
	// policies as a backstop (the adapter injects `no-store` when no
	// rule matches, which would silently un-cache a page — see the
	// middleware). /sitemap.xml and /robots.txt are NOT listed here:
	// they set their own Cache-Control (3600s) in the endpoint.
	routeRules: {
		"/posts/[slug]": { maxAge: 3600, swr: 300, tags: ["posts"] },
		"/projects/[slug]": { maxAge: 3600, swr: 300, tags: ["projects"] },
		"/case-studies/[slug]": { maxAge: 3600, swr: 300, tags: ["case-studies"] },
		"/ventures/[slug]": { maxAge: 3600, swr: 300, tags: ["ventures"] },
		"/releases/[slug]": { maxAge: 3600, swr: 300, tags: ["releases"] },
		"/bn/posts/[slug]": { maxAge: 3600, swr: 300, tags: ["posts"] },
		"/bn/projects/[slug]": { maxAge: 3600, swr: 300, tags: ["projects"] },
		"/bn/case-studies/[slug]": { maxAge: 3600, swr: 300, tags: ["case-studies"] },
		"/bn/ventures/[slug]": { maxAge: 3600, swr: 300, tags: ["ventures"] },
		"/bn/releases/[slug]": { maxAge: 3600, swr: 300, tags: ["releases"] },
		"/posts": { maxAge: 3600, swr: 300, tags: ["posts"] },
		"/projects": { maxAge: 3600, swr: 300, tags: ["projects"] },
		"/case-studies": { maxAge: 3600, swr: 300, tags: ["case-studies"] },
		"/ventures": { maxAge: 3600, swr: 300, tags: ["ventures"] },
		"/releases": { maxAge: 3600, swr: 300, tags: ["releases"] },
		"/bn/posts": { maxAge: 3600, swr: 300, tags: ["posts"] },
		"/bn/projects": { maxAge: 3600, swr: 300, tags: ["projects"] },
		"/bn/case-studies": { maxAge: 3600, swr: 300, tags: ["case-studies"] },
		"/bn/ventures": { maxAge: 3600, swr: 300, tags: ["ventures"] },
		"/bn/releases": { maxAge: 3600, swr: 300, tags: ["releases"] },
		"/": {
			maxAge: 3600,
			swr: 300,
			tags: ["home", "projects", "posts", "case-studies", "ventures", "releases"],
		},
		"/bn": {
			maxAge: 3600,
			swr: 300,
			tags: ["home", "projects", "posts", "case-studies", "ventures", "releases"],
		},
		"/know-me": { maxAge: 3600, swr: 300, tags: ["home"] },
		"/bn/know-me": { maxAge: 3600, swr: 300, tags: ["home"] },
		"/platforms": { maxAge: 3600, swr: 300, tags: ["home"] },
		"/bn/platforms": { maxAge: 3600, swr: 300, tags: ["home"] },
	},
});
