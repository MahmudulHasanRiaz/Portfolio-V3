// Portfolio-V3 Hono API — the single backend (Phase 2).
// Cloudflare Worker `portfolio-v3-api`. Mounts the public content API
// (what the Astro site reads) and the admin CRUD APIs. No cutover yet:
// the admin UI and the public site still talk to the Next.js admin
// API; this worker is additive until the cutover is approved.
//
// Hono 4.13.18 (latest stable, per the V3 latest-version policy).
// Router: the default RegExpRouter — see the note below; SmartRouter
// was deliberately NOT added (202 routes is far below the size where
// it could help, and it would only add a second router to maintain).
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { HTTPException } from "hono/http-exception";
import publicRoutes from "./routes/public";
import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth";
import { createRateLimiter } from "./lib/rate-limit";

type Env = {
  Bindings: {
    PUBLIC_CONTENT_API_TOKEN?: string;
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
  };
};

const app = new Hono<Env>();

app.use("*", logger());

// Security headers on every response. Defaults are kept except the
// two that do not fit a cross-origin JSON API:
// - crossOriginResourcePolicy (default `same-origin`) is OFF: this API
//   is intentionally fetched cross-origin (admin UI + public site via
//   CORS, and media downloads), and CORP `same-origin` would block
//   no-cors cross-origin loads of those responses. CORS below is the
//   access control here, not CORP.
// - crossOriginOpenerPolicy (default `same-origin`) is OFF: this API
//   serves no documents / windows (JSON only), and COOP on the Better
//   Auth redirect responses could interfere with the top-level
//   sign-in redirect flow back to the admin origin.
// Everything else stays on (HSTS, X-Content-Type-Options: nosniff,
// X-Frame-Options: SAMEORIGIN, Referrer-Policy: no-referrer, ...).
// No Content-Security-Policy is set: this API serves no HTML, and a
// CSP header here would be decoration, not protection.
app.use(
  "*",
  secureHeaders({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  }),
);

// The admin UI (browser) calls this API cross-origin after cutover, so
// credentials (the Better Auth session cookie) must be allowed, and the
// origin must be explicit (a wildcard cannot be used with credentials).
app.use(
  "*",
  cors({
    origin: [
      "https://portfolio-v3-admin.riaaz.workers.dev",
      "https://portfolio-v3-public.riaaz.workers.dev",
      "https://admin.riaz.com.bd",
      "https://portfolio-public.riaaz.workers.dev",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Rate-limit the PUBLIC endpoints only (unauthenticated / token-only).
// Generous on purpose: the Astro public site fetches this API
// server-side, so many visitors share the public Worker's egress IP(s).
// 600 requests / 5 min per IP is far above real traffic (a full
// 58-page build makes ~204 live fetches) while still stopping a
// hammering loop. The admin routes are authenticated and low-volume
// and are deliberately NOT limited; POST /leads keeps its own stricter
// 10/hour/IP limit inside routes/public.ts (this limiter is looser, so
// it never changes leads behaviour). See lib/rate-limit.ts for the
// per-isolate caveat (in-memory, best-effort under multi-isolate).
app.use(
  "/api/public/*",
  createRateLimiter({ windowMs: 5 * 60 * 1000, max: 600 }),
);

app.get("/", (c) =>
  c.json({ ok: true, service: "portfolio-v3-api", version: "0.1.0" }),
);
app.get("/health", (c) => c.json({ ok: true }));

// Chained mounts (not statements): `.route()` returns the same app
// instance, so this is runtime-identical to the previous statement
// mounts — but the chain is what carries the mounted sub-apps into
// `typeof api`, which is the type the admin's `hc` client consumes.
// NOTE (verified 2026-11-13 with tsc): the sub-apps themselves are
// still registered statement-style inside their route files, so their
// `typeof` is BlankSchema and the full endpoint types do NOT yet flow
// through to `hc` — `hc<typeof api>` today only knows the mount
// paths, not the 202 endpoints. The follow-up is to build each route
// file's app as a chained expression (no route-file change was in
// scope for this task); once that lands, this export becomes fully
// typed with no change here.
const api = app
  .route("/api/public", publicRoutes)
  .route("/api/admin", adminRoutes)
  .route("/api/auth", authRoutes);

api.notFound((c) => c.json({ error: "Not found" }, 404));
api.onError((err, c) => {
  // HTTPException (see lib/errors.ts `httpError`) keeps its own status
  // and message, in the uniform `{ error }` shape. Nothing throws one
  // today, so this branch changes no current response — it only makes
  // the opt-in helper work when routes adopt it. Everything else is
  // an unexpected failure: log it and return the same generic 500
  // shape the routes use, without leaking the message.
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

// The Hono app type for the admin's type-safe `hc` client
// (`hono/client`): `hc<AppType>(baseUrl)`. See the chaining note
// above for what this type does and does not yet cover.
export type AppType = typeof api;

export default api;
