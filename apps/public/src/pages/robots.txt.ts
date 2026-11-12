import type { APIRoute } from "astro";
import { getSiteSettings } from "../lib/settings";
import { resolveHostBase } from "../lib/detail";

// GET /robots.txt — on-demand (prerender = false), same pattern as
// sitemap.xml.ts, so it reads the live admin setting instead of a
// static file. This REPLACES public/robots.txt (deleted with this
// change): a static file can never honor the toggle, and its
// Sitemap URL pointed at a stale workers.dev subdomain.
//
// Base URL is REQUEST-HOST-AWARE (resolveHostBase): the Sitemap line
// must point at the host the crawler actually fetched robots.txt
// from — a Sitemap on another host is rejected as cross-host. So the
// request host wins; the admin site_url only fills in when there is
// no request host (never in the Worker), and SITE_URL is the last
// resort. A stale deploy can still serve an old robots.txt — that is
// a deploy problem, not a code problem: this file contains no
// hardcoded domain at all, so any fresh deploy is self-consistent
// on every domain it is served on.
//
// Search-indexing gate (admin toggle "search_indexing_enabled"):
//   OFF (default) → `Disallow: /` — crawlers stay out entirely.
//   ON → `Allow: /` + `Sitemap: <siteUrl>/sitemap.xml`.
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	const settings = await getSiteSettings();
	const siteUrl = resolveHostBase(settings.siteUrl, request);
	const body = settings.searchIndexingEnabled
		? ["User-agent: *", "Allow: /", "", `Sitemap: ${siteUrl}/sitemap.xml`, ""].join(
				"\n",
			)
		: ["User-agent: *", "Disallow: /", ""].join("\n");
	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			// Fresh enough to pick up a toggle flip quickly, but
			// cached at the edge so crawlers don't hammer the API.
			"Cache-Control": "public, max-age=3600",
		},
	});
};
