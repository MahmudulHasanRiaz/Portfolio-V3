// Thin same-origin proxy: admin UI -> Hono worker (V3 Hono cutover).
//
// The admin UI calls its API ~197 times via fetch("/api/...") in ~65
// client components. Those calls stay same-origin (no call-site change,
// no CORS, and the Better Auth session cookie rides along) and land
// here, where they are forwarded to the Hono worker — the single
// backend — and Hono's response is returned as-is.
//
// WHY a proxy route and not the Next.js rewrites in next.config.mjs:
// a Worker CANNOT fetch another Worker's `*.workers.dev` URL from
// inside the Worker — every such subrequest fails with Cloudflare
// "error code: 1042" (the `workers.dev` hostname does not resolve in
// the Worker's subrequest context; verified 2026-11-13 by probing
// Hono /health, Hono /api/public/content/projects and the admin
// /auth/login from the public Worker — all 1042 — while an external
// URL returned 200). A Next.js rewrite to the Hono `workers.dev` URL
// therefore 1042s in production. This route instead forwards through
// the HONO_API service binding (wrangler.jsonc `services`), which
// calls the Hono Worker directly with no DNS and no `workers.dev`
// hostname — the only free-tier path that works without a custom
// domain (which the user deferred). The Bearer/session cookie is
// still forwarded, because Hono still requires it.
//
// Path mapping (mirrors the old rewrites): /api/auth/* and
// /api/public/* keep their path on Hono; every other /api/* path is
// an admin resource and is prefixed with /api/admin/.
//   /api/auth/*            -> {HONO}/api/auth/*
//   /api/public/*          -> {HONO}/api/public/*
//   /api/<resource>/*      -> {HONO}/api/admin/<resource>/*
// The local route files for those resources are retired (deleted);
// only /api/portal/* keeps local handlers (Portal is not ported —
// Next.js routing serves those specific routes, not this catch-all).
// Paths Hono does not serve (dead SEO/search routes, /homepage/seed)
// forward to Hono and get Hono's 404, which is the correct answer
// for a route that no longer exists.
//
// Bodies are streamed (duplex) so binary downloads (invoice /
// proposal PDFs) pass through without buffering. When no service
// binding is present (local `next dev`, where the binding does not
// exist) the route falls back to a plain HTTP fetch of the Hono URL
// — that resolves fine from Node, so local dev keeps working.
import { getCloudflareContext } from "@opennextjs/cloudflare";

type HonoBinding = {
	fetch: (req: Request) => Promise<Response>;
};

const HONO_API_URL = (
	process.env.HONO_API_URL ??
	process.env.NEXT_PUBLIC_API_URL ??
	"https://portfolio-v3-api.riaaz.workers.dev"
).replace(/\/$/, "");

async function getHonoBinding(): Promise<HonoBinding | null> {
	try {
		const { env } = await getCloudflareContext({ async: true });
		const binding = (env as unknown as Record<string, unknown>)
			.HONO_API as HonoBinding | undefined;
		if (binding && typeof binding.fetch === "function") return binding;
		return null;
	} catch {
		return null;
	}
}

function mapToHonoPath(path: string[]): string {
	const first = path[0] ?? "";
	if (first === "auth" || first === "public") {
		return `/api/${path.join("/")}`;
	}
	return `/api/admin/${path.join("/")}`;
}

const HOP_HEADERS = new Set([
	"host",
	"connection",
	"content-length",
	"transfer-encoding",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"upgrade",
]);

function forwardHeaders(request: Request): Headers {
	const headers = new Headers();
	for (const [key, value] of request.headers.entries()) {
		if (!HOP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
	}
	return headers;
}

function responseHeaders(res: Response): Headers {
	const headers = new Headers();
	for (const [key, value] of res.headers.entries()) {
		if (!HOP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
	}
	return headers;
}

async function proxyToHono(
	request: Request,
	path: string[],
): Promise<Response> {
	const incomingUrl = new URL(request.url);
	const targetPath = mapToHonoPath(path) + incomingUrl.search;
	const headers = forwardHeaders(request);
	const hasBody = request.method !== "GET" && request.method !== "HEAD";

	try {
		const binding = await getHonoBinding();
		let res: Response;
		if (binding) {
			const req = new Request(`https://hono-api${targetPath}`, {
				method: request.method,
				headers,
				body: hasBody ? request.body : undefined,
				// Required when the body is a stream (undici / workerd).
				// @ts-expect-error duplex is not in the DOM RequestInit type
				duplex: "half",
				signal: AbortSignal.timeout(30_000),
			});
			res = await binding.fetch(req);
		} else {
			res = await fetch(`${HONO_API_URL}${targetPath}`, {
				method: request.method,
				headers,
				body: hasBody ? request.body : undefined,
				// @ts-expect-error duplex is not in the DOM RequestInit type
				duplex: "half",
				signal: AbortSignal.timeout(30_000),
			});
		}
		return new Response(res.body, {
			status: res.status,
			headers: responseHeaders(res),
		});
	} catch (err) {
		return Response.json(
			{ error: "Hono API unreachable" },
			{ status: 502 },
		);
	}
}

type RouteContext = {
	params: Promise<{ path: string[] }>;
};

export async function GET(request: Request, ctx: RouteContext) {
	return proxyToHono(request, (await ctx.params).path);
}

export async function POST(request: Request, ctx: RouteContext) {
	return proxyToHono(request, (await ctx.params).path);
}

export async function PUT(request: Request, ctx: RouteContext) {
	return proxyToHono(request, (await ctx.params).path);
}

export async function PATCH(request: Request, ctx: RouteContext) {
	return proxyToHono(request, (await ctx.params).path);
}

export async function DELETE(request: Request, ctx: RouteContext) {
	return proxyToHono(request, (await ctx.params).path);
}

export async function OPTIONS() {
	return new Response(null, { status: 204 });
}
