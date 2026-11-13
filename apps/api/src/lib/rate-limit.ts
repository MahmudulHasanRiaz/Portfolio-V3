// In-memory fixed-window rate limiter for the Hono Worker.
//
// There is NO built-in rate-limit middleware in Hono 4.13.18 (checked
// node_modules/hono/dist/middleware — no rate-limit entry), so this is a
// small hand-rolled middleware instead of a new dependency.
//
// Edge notes:
// - Per-isolate state: each Cloudflare Worker isolate keeps its own Map,
//   so under multi-isolate deployment the limit is best-effort per
//   isolate, not a global count. That matches the existing POST /leads
//   limiter in routes/public.ts (same caveat, documented there) and is
//   acceptable for abuse mitigation on a low-traffic portfolio API. A
//   shared limiter (KV / Durable Object) is a cutover concern, not a
//   prerequisite — do NOT add a KV/DO binding for this.
// - The Map is bounded: expired entries are swept whenever it grows
//   past MAX_ENTRIES_BEFORE_SWEEP, so a flood of distinct IPs cannot
//   grow memory without bound.
// - Only the PUBLIC (unauthenticated / token-only) endpoints use this
//   (mounted on /api/public/* in index.ts). Admin routes are
//   authenticated and low-volume and are deliberately NOT limited here.
// - The limit is generous on purpose: the Astro public site fetches
//   this API server-side, so many visitors share the public Worker's
//   egress IP(s). 600 requests / 5 min per IP is far above the site's
//   real traffic (a full 58-page build makes ~204 live fetches) while
//   still stopping a hammering loop. POST /leads keeps its own much
//   stricter 10/hour/IP limit in routes/public.ts; this limiter sits
//   in front of it but is looser, so it never changes leads behaviour.
// - Preflight OPTIONS requests are never counted (the CORS middleware
//   answers those before this runs; the skip is defence in depth, so a
//   429 can never break a browser preflight).
// - On limit: 429 + the same { error } shape the rest of the API uses,
//   plus a Retry-After header (seconds until the window resets).
//   Legitimate requests never see it, so their responses are unchanged.
import type { Context, MiddlewareHandler } from "hono";

export interface RateLimitOptions {
  /** Length of one fixed window, in milliseconds. */
  windowMs: number;
  /** Max requests per key (IP) per window. */
  max: number;
  /** Body message for the 429 response. Defaults to a generic string. */
  message?: string;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

/** Sweep expired entries once the map grows past this size. */
const MAX_ENTRIES_BEFORE_SWEEP = 1000;

/**
 * Best client-IP signal on Cloudflare Workers. `cf-connecting-ip` is
 * set by Cloudflare itself and cannot be spoofed by the client through
 * the edge; `x-forwarded-for` / `x-real-ip` are fallbacks for
 * non-Cloudflare callers (local dev). Only the first forwarded entry
 * is used — later entries are proxies, not the client.
 */
function clientIp(c: Context): string {
  const connecting = c.req.header("cf-connecting-ip")?.trim();
  if (connecting) return connecting;
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return c.req.header("x-real-ip")?.trim() || "unknown";
}

export function createRateLimiter(options: RateLimitOptions): MiddlewareHandler {
  const { windowMs, max } = options;
  const message = options.message ?? "Too many requests. Please try again later.";
  const windows = new Map<string, WindowEntry>();

  return async (c, next) => {
    if (c.req.method === "OPTIONS") {
      await next();
      return;
    }

    const now = Date.now();

    // Bound the map: drop expired windows once it grows large.
    if (windows.size > MAX_ENTRIES_BEFORE_SWEEP) {
      for (const [key, entry] of windows) {
        if (now >= entry.resetAt) windows.delete(key);
      }
    }

    const key = clientIp(c);
    const entry = windows.get(key);
    if (!entry || now >= entry.resetAt) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }
    if (entry.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      return c.json(
        { error: message },
        429,
        { "Retry-After": String(retryAfter) },
      );
    }
    entry.count += 1;
    await next();
  };
}
