// Edge-cache backstop for live pages (Issue 7B, extended 2026-11-12
// for the all-live site).
//
// DIAGNOSIS (2026-11-09, measured from this VM): the `routeRules` in
// astro.config.mjs ARE correct and complete, and the currently deployed
// Worker DOES serve repeats from the edge (cold MISS TTFB 3.25–3.6 s →
// immediate repeat HIT TTFB ~0.35 s). But the caching has two silent
// single points of failure, both invisible in the response headers:
//
//   1. The cache provider only emits `Cloudflare-CDN-Cache-Control`
//      when a route rule matched (or Astro.cache.set carried a maxAge —
//      it cannot: CacheHint is tags + lastModified only). When NO rule
//      matches, the Cloudflare adapter injects
//      `Cloudflare-CDN-Cache-Control: no-store` (see
//      @astrojs/cloudflare/dist/utils/response.js) and the edge NEVER
//      caches the page — every visit pays the full Worker render
//      (~2–3.5 s: slow VPS API + settings fetch). A stale deploy, a
//      renamed route, or a rule dropped from the manifest fails exactly
//      this way, with nothing in the headers to tell you.
//   2. The provider never sets a plain `Cache-Control`, so Astro's
//      fallback stamps `Cache-Control: no-cache` on every detail page
//      (Last-Modified is present from the live entry's cacheHint).
//      The edge still caches (the CDN header governs it), but browsers
//      must revalidate on EVERY navigation — a wasted round trip on
//      every back/forward and repeat visit.
//
// This middleware closes both gaps for ALL content pages, and only for
// them: it sets an explicit plain `Cache-Control` (same values as the
// edge policy, so browser and edge staleness agree and tag purges still
// bound staleness) and, as a belt-and-braces, a
// `Cloudflare-CDN-Cache-Control` with the same values. It runs BEFORE
// Astro's cache-header step, so when a route rule did match, the
// provider overwrites the CDN header with its own identical directive;
// when no rule matched, this value stands instead of the adapter's
// no-store.
//
// Policies (keep in sync with the routeRules in astro.config.mjs):
//   ALL content pages — fresh 3600 s (1 h), stale-while-revalidate
//     300 s. Freshness comes from the tag purge (POST
//     /api/cache/invalidate, fired by the V2 admin on every content
//     save), NOT from a short TTL — see docs/BUILD_GUARD.md Rule 8.
//     The long TTL is what makes repeat visits edge hits instead of
//     ~5 s cold Worker renders (measured 2026-11-12).
//
// Deliberately NOT applied to: /api/* (settings is cached 60s at its
// own route — see src/pages/api/settings.ts — and /api/contact is a
// POST), /sitemap.xml and /robots.txt (they set their own Cache-Control
// of 3600 s), non-GET, non-200, non-HTML, or responses carrying
// Set-Cookie. Since the 2026-11-12 switch to output "server" there are
// no prerendered pages left: every content page goes through the Worker
// and through this middleware.

import { defineMiddleware } from "astro:middleware";

const DETAIL_ROUTE_RE =
	/^\/(bn\/)?(posts|projects|case-studies|ventures|releases)\/[^/]+\/?$/;

// Archives, Know Me, Platforms (EN + BN). The homepage pattern also
// matches "/bn" and "/bn/".
const LIST_ROUTE_RE =
	/^\/(bn\/)?(posts|projects|case-studies|ventures|releases|know-me|platforms)\/?$/;
const HOME_ROUTE_RE = /^\/(bn\/?)?$/;

// Keep in sync with the routeRules in astro.config.mjs (all content
// routes: 1 h fresh, 5 min SWR — see Rule 8).
const DETAIL_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=300";
// Keep in sync with the routeRules in astro.config.mjs (same policy).
const LIST_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=300";

export const onRequest = defineMiddleware(async (context, next) => {
	const response = await next();
	if (context.request.method !== "GET") return response;
	const pathname = new URL(context.request.url).pathname;
	const policy = DETAIL_ROUTE_RE.test(pathname)
		? DETAIL_CACHE_CONTROL
		: LIST_ROUTE_RE.test(pathname) || HOME_ROUTE_RE.test(pathname)
			? LIST_CACHE_CONTROL
			: null;
	if (!policy) return response;
	if (response.status !== 200) return response;
	if (!(response.headers.get("content-type") ?? "").includes("text/html")) {
		return response;
	}
	if (response.headers.has("set-cookie")) return response;
	// Plain Cache-Control for browsers (kills the `no-cache` fallback).
	if (!response.headers.has("cache-control")) {
		response.headers.set("Cache-Control", policy);
	}
	// Edge directive backstop (see header comment). The cache provider
	// overwrites this with the same values when a route rule matched.
	if (!response.headers.has("cloudflare-cdn-cache-control")) {
		response.headers.set("Cloudflare-CDN-Cache-Control", policy);
	}
	return response;
});
