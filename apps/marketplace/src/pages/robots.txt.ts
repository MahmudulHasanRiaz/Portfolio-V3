import type { APIRoute } from "astro";

// GET /robots.txt — MARKETPLACE COPY (see docs/MARKETPLACE.md).
//
// ALWAYS `Disallow: /` — hardcoded, with NO Sitemap line. This is NOT
// wired to the admin panel's search-indexing switch and is NOT driven
// by settings: the marketplace copy must NEVER be indexed, regardless
// of that switch. Do not add an override or a Sitemap line (there is
// no sitemap on this copy).
//
// No settings fetch, so this route needs no API call at all.
export const prerender = false;

export const GET: APIRoute = () => {
	const body = ["User-agent: *", "Disallow: /", ""].join("\n");
	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
