// Site settings (hero portrait + default profile) from the admin panel.
//
// Server-only: reads the admin-managed settings via the Public Content
// API (GET {PUBLIC_CONTENT_API_URL}/api/public/settings) through the
// loader's fetchPublicSettings(). Never throws — on any failure it
// returns the fail-safe defaults (repo portrait, Software Engineer
// profile) so the build and every page keep working when the API is
// unset or unreachable. The dashboard side owns the API; this side only
// consumes it.
//
// Hybrid live-then-static: pages await getSiteSettings() at build /
// request time (the static half); the client live-swap script in
// Hero.astro fetches /api/settings after load (the live half).

import {
	fetchPublicSettings,
	DEFAULT_PUBLIC_SETTINGS,
	type PublicSettings,
} from "../loaders/public-content";

export type { PublicSettings, PrimaryIdentity, DefaultLanguage, SettingsBn } from "../loaders/public-content";

// Memoised settings fetch (Issue 7B).
//
// Layout, Hero and Stats each call getSiteSettings() while rendering ONE
// page — before this, every call hit the API separately (~1.16 s each
// on the slow VPS, serialised into the page's TTFB). A single Worker
// request / build step now fetches settings ONCE:
//   - concurrent callers share the single in-flight promise, and
//   - the resolved value is reused for SETTINGS_TTL_MS afterwards.
// The TTL is deliberately short (60 s, well under the 300 s edge cache
// on detail pages): settings change rarely via the admin panel, and a
// stale value can never outlive the edge cache by much. The memo lives
// in module state, so it is per Worker isolate (warm isolates reuse it
// up to the TTL; cold isolates fetch once) and per build process (the
// prerender fetches once per minute instead of once per page).
// fetchPublicSettings() never throws, so the cached promise never
// rejects; a failed fetch caches the fail-safe defaults for the TTL.
const SETTINGS_TTL_MS = 60_000;

let cachedSettings:
	| { promise: Promise<PublicSettings>; at: number }
	| undefined;

export async function getSiteSettings(): Promise<PublicSettings> {
	const now = Date.now();
	if (cachedSettings && now - cachedSettings.at < SETTINGS_TTL_MS) {
		return cachedSettings.promise;
	}
	const promise = (async (): Promise<PublicSettings> => {
		try {
			return await fetchPublicSettings();
		} catch {
			return { ...DEFAULT_PUBLIC_SETTINGS };
		}
	})();
	cachedSettings = { promise, at: now };
	return promise;
}
