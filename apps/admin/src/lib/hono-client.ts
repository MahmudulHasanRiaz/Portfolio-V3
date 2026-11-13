// Hono API client for the admin (V3 Hono cutover).
//
// The admin UI reaches the Hono worker (the single backend) in two ways:
//  1. Browser fetch("/api/...") calls — those go through the Next.js
//     `beforeFiles` rewrites in next.config.mjs, which proxy /api/* to the
//     Hono worker same-origin (so the Better Auth session cookie rides
//     along and no CORS is involved). No per-call-site change needed.
//  2. Server actions (apps/admin/src/actions/*) — those call Hono
//     directly, server-to-server, through the helpers in this file.
//
// Type-safety status (2026-11-13, verified with tsc): apps/api exports
// `AppType` from apps/api/src/index.ts, but the Hono route files still
// register handlers statement-style, so every sub-app's typeof is
// BlankSchema — and `hc<AppType>`'s static type collapses to `unknown`
// (verified: even a minimal chained app with a statement-style sub-app
// yields an `unknown` client, so not even the mount paths are typed).
// Zero endpoints get `hc` type-safety this round. The server actions
// therefore call the endpoints through `honoFetch<T>()` with explicit
// per-endpoint request/response types (the sanctioned fallback).
// `getHonoClient()` is still the single `hc` construction point (same
// URL, same cookie-forwarding fetch) so the actions can switch to typed
// RPC calls with no URL changes once the route files are re-chained
// as expressions — at that point `hc<AppType>` will resolve properly.
//
// This module is server-only by convention: it reads the incoming
// request's cookie via next/headers. Never import it from a client
// component.

import { hc } from "hono/client";
import type { AppType } from "@repo/api";
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Production Hono worker. Overridden by HONO_API_URL (server-side,
 *  runtime, set in wrangler.jsonc) or NEXT_PUBLIC_API_URL (build-time,
 *  also the rewrite destination in next.config.mjs). */
export const DEFAULT_HONO_API_URL =
  "https://portfolio-v3-api.riaaz.workers.dev";

type HonoBinding = {
	fetch: (req: Request) => Promise<Response>;
};

/**
 * The HONO_API service binding (wrangler.jsonc `services`), or null
 * when there is none (local `next dev`). A Worker CANNOT fetch another
 * Worker's `*.workers.dev` URL from inside the Worker (Cloudflare
 * "error code: 1042" — the `workers.dev` hostname does not resolve in
 * the Worker's subrequest context), so server actions reach Hono
 * through this binding instead of over HTTPS. See also the /api/*
 * proxy route (src/app/api/[...path]/route.ts), which uses the same
 * binding for the browser's calls.
 */
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

export function getHonoApiUrl(): string {
  const url =
    process.env.HONO_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_HONO_API_URL;
  return url.replace(/\/$/, "");
}

/** The Better Auth session cookie of the incoming admin request, so
 *  Hono's requireAuth (same ba_session table, same random token) can
 *  validate the call. Returns null outside a request context. */
export async function getRequestCookie(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("cookie");
  } catch {
    return null;
  }
}

/**
 * fetch() that forwards the incoming request's session cookie to Hono.
 * Used as the hc client's fetch implementation, so every RPC call is
 * authenticated as the signed-in admin user.
 */
export const honoAuthFetch: typeof fetch = async (input, init) => {
  const cookie = await getRequestCookie();
  const nextHeaders = new Headers(init?.headers);
  if (cookie && !nextHeaders.has("cookie")) {
    nextHeaders.set("cookie", cookie);
  }
  return fetch(input, { ...init, headers: nextHeaders });
};

/**
 * The `hc` RPC client, pointed at the Hono worker, authenticated with
 * the incoming request's session cookie.
 *
 * NOTE: its static type is `unknown` this round — `hc<AppType>` collapses
 * (see the header note) because the route files are not yet chained.
 * It is kept as the single construction point for the day chaining
 * lands; endpoint calls today go through `honoFetch<T>()`.
 */
export function getHonoClient() {
  return hc<AppType>(getHonoApiUrl(), { fetch: honoAuthFetch });
}

/** Error thrown when Hono answers with a non-2xx status. Carries the
 *  `{ error }` message Hono returns so server actions can surface the
 *  same message the old DB-direct code threw. */
export class HonoApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HonoApiError";
  }
}

export type HonoFetchOptions = Omit<RequestInit, "body"> & {
  /** JSON body — stringified, with Content-Type set. */
  json?: unknown;
  /** Query params — appended to the path. */
  query?: Record<string, string | number | boolean | undefined>;
};

/**
 * Typed server-to-Hono call for one endpoint. `path` is the Hono path
 * (e.g. "/api/admin/content/projects?page=1" or "/api/admin/content"
 * with `query`), `T` is the endpoint's documented response shape.
 * Forwards the session cookie, never caches, and throws HonoApiError
 * (with Hono's `{ error }` message) on any non-2xx status.
 */
export async function honoFetch<T>(
  path: string,
  options: HonoFetchOptions = {},
): Promise<T> {
  const { json, query, ...init } = options;
  let url = `${getHonoApiUrl()}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }
  const requestHeaders = new Headers(init.headers);
  const cookie = await getRequestCookie();
  if (cookie && !requestHeaders.has("cookie")) {
    requestHeaders.set("cookie", cookie);
  }
  let body: BodyInit | undefined;
  if (json !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }
  // Service binding first (no 1042), plain HTTPS fallback for local dev.
  // The binding routes by service, not hostname, so the Request uses a
  // placeholder origin and the Hono path (the `path` argument, with any
  // query string already appended to `url` — strip the origin back off).
  const honoPath = url.slice(getHonoApiUrl().length);
  const binding = await getHonoBinding();
  const res = binding
    ? await binding.fetch(
        new Request(`https://hono-api${honoPath}`, {
          method: init.method ?? "GET",
          headers: requestHeaders,
          body,
          cache: "no-store",
        }),
      )
    : await fetch(url, {
        ...init,
        headers: requestHeaders,
        body,
        cache: "no-store",
      });
  if (!res.ok) {
    let message = `Hono request failed (${res.status})`;
    try {
      const data: unknown = await res.json();
      if (
        data !== null &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string" &&
        (data as { error: string }).error
      ) {
        message = (data as { error: string }).error;
      }
    } catch {
      // Keep the default message when the error body is not JSON.
    }
    throw new HonoApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
