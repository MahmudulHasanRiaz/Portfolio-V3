import type { APIRoute } from "astro";
import { fetchPublicSettings } from "../../loaders/public-content";

// GET /api/settings — same-origin proxy for the admin-managed site
// settings (hero portrait URL, favicon URL, default profile, default
// language, hero / Know Me copy + Bangla overlay).
//
// The client live-swap script in Hero.astro calls this route (no CORS
// issue: same origin). It fetches the admin
// GET {PUBLIC_CONTENT_API_URL}/api/public/settings server-side with an
// 8s timeout and returns the full settings object. On any failure —
// API unset, unreachable, non-200, malformed — it returns the fail-safe
// defaults, never an error, so the client script simply keeps the
// rendered photo.
//
// Edge-cached 60s + stale-while-revalidate 300s (PageSpeed 2026-11-10:
// the uncached fetch took 2.4s and was the longest critical-path item).
// Settings are PUBLIC (same for every visitor, no user data) and change
// rarely via the admin panel, so a 60s staleness bound is invisible in
// practice — and the hero swap is deferred until after window load, so
// LCP never waits on this fetch even on a cold edge.
export const prerender = false;

export const GET: APIRoute = async () => {
	const settings = await fetchPublicSettings();
	return Response.json(settings, {
		headers: {
			"Cache-Control": "public, max-age=60, stale-while-revalidate=300",
		},
	});
};
