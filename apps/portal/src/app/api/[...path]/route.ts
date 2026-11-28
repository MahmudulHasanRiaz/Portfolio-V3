// Thin same-origin proxy: portal UI -> Hono worker (Phase 5 portal port).
//
// The portal has no backend of its own any more: every /api/* call goes
// to Hono, and Hono's response is returned as-is. The portal UI's fetch
// calls stay same-origin (no call-site change, no CORS, and the Better
// Auth session cookie rides along).
//
// Path mapping (mirrors the admin proxy's shape):
//   /api/auth/*        -> {HONO}/api/auth/*        (Better Auth handler)
//   /api/portal/*      -> {HONO}/api/portal/*      (portal auth endpoints)
//   /api/<resource>/*  -> {HONO}/api/portal/<resource>/*
// The old local /api/* route files are retired (deleted); there are no
// local /api/* handlers left in the portal app.
//
// WHY a proxy route and not a Next.js rewrite: a Worker CANNOT fetch
// another Worker's `*.workers.dev` URL from inside the Worker — every
// such subrequest fails with Cloudflare "error code: 1042" (verified
// 2026-11-13 for the admin). This route forwards through the HONO_API
// service binding (wrangler.jsonc `services`), which calls the Hono
// Worker directly with no DNS and no `*.workers.dev` hostname. When no
// service binding is present (local `next dev`) it falls back to a plain
// HTTP fetch of the Hono URL, which resolves fine from Node.
import { getCloudflareContext } from "@opennextjs/cloudflare";

type HonoBinding = {
  fetch: (req: Request) => Promise<Response>;
};

const HONO_API_URL = (
  process.env.HONO_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "https://api.mahmudulhasanriaz.com"
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
  if (first === "auth" || first === "portal") {
    // /api/auth/* (Better Auth handler) and /api/portal/* (portal auth
    // endpoints) already carry their Hono prefix.
    return `/api/${path.join("/")}`;
  }
  return `/api/portal/${path.join("/")}`;
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
  } catch {
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
