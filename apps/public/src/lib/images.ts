// Shared image helpers — responsive sizes without an image CDN.
//
// Three sources, three paths (nothing is ever upscaled, nothing is
// ever over-compressed — quality 75, AVIF/WebP where the browser
// supports them):
//   1. Local public/ files → Astro <Picture> at build time (Sharp).
//   2. Unsplash → server-side w= rewrite (q=75), srcset from the URL.
//   3. Admin remote images (https://files.riaz.com.bd/*) → the
//      on-demand /api/image Worker route (Cloudflare Images binding):
//      first request transforms + edge-caches, later requests are
//      cache hits. Any other remote URL returns unchanged — it has
//      its own handling (YouTube thumbs, Simple Icons CDN, …) or
//      none, and must never be proxied through our transform quota.
export const REMOTE_IMAGE_HOST = "files.riaz.com.bd";

/** Widths the /api/image route will serve. Anything else is clamped
    to the nearest entry (never upscaled past the original — the route
    uses fit: "scale-down"). Keep this list SHORT: every width is a
    separate unique transformation against the 5,000/month free
    Cloudflare quota. */
export const IMAGE_WIDTHS = [360, 480, 720, 800, 1024, 1200, 1600, 2048];

/** Quality for every transform (route + Unsplash q=). 75 is the
    quality-preserving point: visibly identical to the original at
    display size, ~30–50% smaller than q=85. Never lower it to chase
    bytes — a visibly worse image is not an optimization. */
export const IMAGE_QUALITY = 75;

/** True only for the admin-managed remote origin. The check parses
    the URL — a substring test would let `evilfiles.riaz.com.bd` or
    `files.riaz.com.bd.evil.com` through. */
export function isFilesRiazUrl(
	url: string | null | undefined,
): url is string {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		return (
			parsed.protocol === "https:" && parsed.hostname === REMOTE_IMAGE_HOST
		);
	} catch {
		return false;
	}
}

/** Nearest whitelisted width (ties go to the smaller entry). A bad or
    missing value falls back to 800 — the common display width. */
export function clampImageWidth(width: number): number {
	if (!Number.isFinite(width) || width <= 0) return 800;
	let nearest = IMAGE_WIDTHS[0];
	for (const w of IMAGE_WIDTHS) {
		if (Math.abs(w - width) < Math.abs(nearest - width)) nearest = w;
	}
	return nearest;
}

/**
 * Optimized URL for one width. A files.riaz.com.bd URL becomes the
 * /api/image route (clamped to the whitelist); anything else — local
 * path, Unsplash, YouTube, another host — is returned unchanged, so
 * callers can use this unconditionally without branching.
 */
export function optimizedImageUrl(
	url: string | null | undefined,
	width = 800,
): string | undefined {
	if (!url) return undefined;
	if (!isFilesRiazUrl(url)) return url;
	return `/api/image?u=${encodeURIComponent(url)}&w=${clampImageWidth(width)}`;
}

/** srcset for a files.riaz.com.bd URL (widths clamped + deduped);
    undefined for anything else — the caller falls back to the
    source's own srcset (Unsplash) or none. */
export function optimizedSrcset(
	url: string | null | undefined,
	widths: number[],
): string | undefined {
	if (!isFilesRiazUrl(url)) return undefined;
	const unique = [...new Set(widths.map(clampImageWidth))].sort(
		(a, b) => a - b,
	);
	return unique
		.map((w) => `${optimizedImageUrl(url, w)} ${w}w`)
		.join(", ");
}

export function unsplashSrcset(
	url: string | null | undefined,
	widths: number[],
): string | undefined {
	if (!url) return undefined;
	if (!url.includes("images.unsplash.com")) return undefined;
	if (!/w=\d+/.test(url)) return undefined;
	return widths
		.map(
			(w) =>
				`${url.replace(/w=\d+/, `w=${w}`).replace(/q=\d+/, `q=${IMAGE_QUALITY}`)} ${w}w`,
		)
		.join(", ");
}

/** One srcset for any remote URL: Unsplash first, then the /api/image
    route, else undefined. Local <Picture> assets never reach here. */
export function remoteSrcset(
	url: string | null | undefined,
	widths: number[],
): string | undefined {
	return (
		unsplashSrcset(url, widths) ?? optimizedSrcset(url, widths)
	);
}
