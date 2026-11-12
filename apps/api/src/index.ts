// Portfolio-V3 Hono API — the single backend (Phase 2).
// Cloudflare Worker `portfolio-v3-api`. Mounts the public content API
// (what the Astro site reads) and the admin CRUD APIs. No cutover yet:
// the admin UI and the public site still talk to the Next.js admin
// API; this worker is additive until the cutover is approved.
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import publicRoutes from "./routes/public";
import adminRoutes from "./routes/admin";

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

app.get("/", (c) =>
  c.json({ ok: true, service: "portfolio-v3-api", version: "0.1.0" }),
);
app.get("/health", (c) => c.json({ ok: true }));

app.route("/api/public", publicRoutes);
app.route("/api/admin", adminRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
