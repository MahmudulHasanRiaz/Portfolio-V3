import type { APIRoute } from "astro";
import {
	clampImageWidth,
	isFilesRiazUrl,
	IMAGE_QUALITY,
} from "../../lib/images";

// GET /api/image?u=<encoded remote URL>&w=<width> — on-demand image
// optimization for admin-managed remote images.
//
// The admin (Next.js/Portainer) stores originals on RustFS at
// https://files.riaz.com.bd/* — no resize/convert happens at upload
// time, and the public site is static-first, so a new admin image
// would otherwise ship full-size forever. This route closes that gap:
// the first request transforms the image (Cloudflare Images binding,
// AVIF/WebP at quality 75, width clamped to the whitelist, never
// upscaled), the edge caches the result for a day, and every later
// request is a cache hit — no rebuild, no manual step, no admin
// change needed when a new image is added.
//
// Safety, in order:
//   - STRICT allowlist: only https://files.riaz.com.bd/* is ever
//     fetched or transformed. Anything else is never proxied — a
//     well-formed foreign URL 302s to itself (the browser would
//     fetch it anyway; no quota is spent), anything malformed 400s.
//     Without this the route would be an open proxy burning the
//     5,000 free transformations/month on anyone's images.
//   - Width whitelist (src/lib/images.ts IMAGE_WIDTHS): any other
//     width clamps to the nearest entry, so srcset authors cannot
//     mint unlimited unique transformations.
//   - NEVER an error page: a fetch failure, a non-image response,
//     an SVG (not resizable), a missing binding, a transform error
//     or a quota error (9422) all 302 to the ORIGINAL URL. The
//     visitor always sees the image — at worst unoptimized.
//   - Format is negotiated from the request Accept header (AVIF →
//     WebP → JPEG): the same "format auto" the URL API does, done
//     by hand because the Images binding takes one explicit format.
//     `Vary: Accept` is set so caches keep the variants apart.
//
// Transform path: the Images binding first (env.IMAGES — declared in
// wrangler.jsonc; the Astro adapter also auto-provisions it under
// its default `cloudflare-binding` image service). If the binding is
// absent — local `astro dev`, or a deploy where it was not
// provisioned — the fetch-time `cf.image` option is the fallback
// (same engine, same quota; in local dev it is a low-fidelity mock
// that returns the original bytes). Real output must be verified
// after deploy, never from local dev.
export const prerender = false;

const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=86400";
const FETCH_TIMEOUT_MS = 8000;
const DEFAULT_WIDTH = 800;

type OutputFormat = "image/avif" | "image/webp" | "image/jpeg";
type CfFormat = "avif" | "webp" | "jpeg";

function pickFormats(accept: string | null): {
	binding: OutputFormat;
	cf: CfFormat;
} {
	if (accept?.includes("image/avif"))
		return { binding: "image/avif", cf: "avif" };
	if (accept?.includes("image/webp"))
		return { binding: "image/webp", cf: "webp" };
	return { binding: "image/jpeg", cf: "jpeg" };
}

/** The original image, as a redirect — the never-fail fallback. */
function redirectToOriginal(original: string): Response {
	return Response.redirect(original, 302);
}

interface ImagesBindingLike {
	input: (
		stream: ReadableStream<Uint8Array>,
	) => {
		transform: (t: {
			width: number;
			fit: "scale-down";
		}) => {
			output: (o: {
				format: OutputFormat;
				quality: number;
			}) => Promise<{
				response: (opts?: {
					headers?: HeadersInit;
				}) => Response;
			}>;
		};
	};
}

async function resolveImagesBinding(): Promise<
	ImagesBindingLike | undefined
> {
	try {
		// Worker runtime — dynamic import so the Node prerender build
		// stays green (same pattern as src/loaders/public-content.ts).
		const { env } = await import("cloudflare:workers");
		const binding = (env as Record<string, unknown>).IMAGES;
		return (binding as ImagesBindingLike | undefined) ?? undefined;
	} catch {
		// Not running in a Worker (local dev / build).
		return undefined;
	}
}

export const GET: APIRoute = async ({ request }) => {
	const params = new URL(request.url).searchParams;
	const raw = params.get("u");
	if (!raw) {
		return Response.json({ error: "Missing u parameter" }, { status: 400 });
	}
	let original: URL;
	try {
		original = new URL(raw);
	} catch {
		return Response.json({ error: "Invalid u parameter" }, { status: 400 });
	}
	if (!isFilesRiazUrl(original.href)) {
		// Well-formed but off-allowlist: never fetch it, never spend
		// quota on it — send the browser straight to the original.
		// (A non-http(s) URL has nowhere to redirect to: 400.)
		if (original.protocol !== "http:" && original.protocol !== "https:") {
			return Response.json(
				{ error: "u must be an https URL" },
				{ status: 400 },
			);
		}
		return redirectToOriginal(original.href);
	}
	const width = clampImageWidth(
		Number.parseInt(params.get("w") ?? "", 10) || DEFAULT_WIDTH,
	);
	const formats = pickFormats(request.headers.get("accept"));
	const originalUrl = original.href;

	let upstream: Response;
	try {
		upstream = await fetch(originalUrl, {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
	} catch {
		return redirectToOriginal(originalUrl);
	}
	if (!upstream.ok || !upstream.body) {
		return redirectToOriginal(originalUrl);
	}
	const contentType = upstream.headers.get("content-type") ?? "";
	if (!contentType.startsWith("image/") || contentType.includes("svg")) {
		// Not an image, or an SVG (Images cannot resize SVG) — the
		// original is the correct response, not an error.
		return redirectToOriginal(originalUrl);
	}

	// Path 1: Images binding (production).
	const binding = await resolveImagesBinding();
	if (binding) {
		try {
			const result = await binding
				.input(upstream.body)
				.transform({ width, fit: "scale-down" })
				.output({ format: formats.binding, quality: IMAGE_QUALITY });
			return result.response({
				headers: {
					"Cache-Control": CACHE_CONTROL,
					Vary: "Accept",
				},
			});
		} catch {
			// Transform failed (bad bytes, quota 9422, …) — original.
			return redirectToOriginal(originalUrl);
		}
	}

	// Path 2: no binding (local dev / unprovisioned deploy) — the
	// fetch-time cf.image transform. In workerd this transforms for
	// real; in local `astro dev` the cf option is ignored and the
	// original bytes come back, which is the honest dev behaviour.
	try {
		const transformed = await fetch(originalUrl, {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			cf: {
				image: {
					width,
					quality: IMAGE_QUALITY,
					format: formats.cf,
					fit: "scale-down",
				},
			},
		});
		if (!transformed.ok || !transformed.body) {
			return redirectToOriginal(originalUrl);
		}
		return new Response(transformed.body, {
			headers: {
				"Content-Type":
					transformed.headers.get("content-type") ?? contentType,
				"Cache-Control": CACHE_CONTROL,
				Vary: "Accept",
			},
		});
	} catch {
		return redirectToOriginal(originalUrl);
	}
};
