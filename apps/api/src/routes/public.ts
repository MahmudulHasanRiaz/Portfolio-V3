// Public Content API — Hono port of the Next.js admin routes:
//   GET /api/public/content/:type
//   GET /api/public/content/:type/:slug
//   GET /api/public/settings
// Response shapes mirror the Next.js routes exactly (the Astro live
// loader accepts either a bare array or { items } for lists, and either
// the bare item or { item } for a single item).
// Auth: the same dual-token model as the admin (see lib/public-content
// isAuthorized) — env PUBLIC_CONTENT_API_TOKEN, or a per-integration
// Bearer token. NO Better Auth on these routes.
import { Hono } from "hono";
import {
  getPublicContent,
  getPublicSettings,
  isAuthorized,
  isPublicContentType,
  listPublicContent,
} from "../lib/public-content";

type Env = {
  Bindings: {
    PUBLIC_CONTENT_API_TOKEN?: string;
    DATABASE_URL?: string;
  };
};

const app = new Hono<Env>();

function waitUntilOf(c: {
  executionCtx?: { waitUntil: (promise: Promise<unknown>) => void };
}): ((promise: Promise<unknown>) => void) | undefined {
  const w = c.executionCtx?.waitUntil;
  return w ? w.bind(c.executionCtx) : undefined;
}

app.get("/content/:type", async (c) => {
  try {
    const type = c.req.param("type");
    if (!isPublicContentType(type)) {
      return c.json({ error: "Unknown content type" }, 404);
    }
    const ok = await isAuthorized(
      c.req.raw,
      c.env.PUBLIC_CONTENT_API_TOKEN,
      waitUntilOf(c),
    );
    if (!ok) return c.json({ error: "Unauthorized" }, 401);
    const items = await listPublicContent(type);
    // Ya Nabi rule (LIST ONLY): "Ya Nabi Salam Alaika" must NEVER be
    // shown separately (no spotlight / featured / homepage). It may exist
    // as an ordinary row in the full releases list + an ordinary detail
    // page, but the live loader merges this list into the homepage, so it
    // is excluded here to keep it off the homepage. The single-item
    // endpoint must still return it — do NOT move this filter into
    // listPublicContent / getPublicContent.
    const visible =
      type === "releases"
        ? items.filter((item) => item.slug !== "ya-nabi-salam-alaika")
        : items;
    return c.json({ items: visible });
  } catch {
    return c.json({ error: "Failed to load public content" }, 500);
  }
});

app.get("/content/:type/:slug", async (c) => {
  try {
    const type = c.req.param("type");
    const slug = c.req.param("slug");
    if (!isPublicContentType(type)) {
      return c.json({ error: "Unknown content type" }, 404);
    }
    const ok = await isAuthorized(
      c.req.raw,
      c.env.PUBLIC_CONTENT_API_TOKEN,
      waitUntilOf(c),
    );
    if (!ok) return c.json({ error: "Unauthorized" }, 401);
    const item = await getPublicContent(type, decodeURIComponent(slug));
    if (!item) return c.json({ error: "Not found" }, 404);
    return c.json(item);
  } catch {
    return c.json({ error: "Failed to load public content" }, 500);
  }
});

app.get("/settings", async (c) => {
  try {
    const ok = await isAuthorized(
      c.req.raw,
      c.env.PUBLIC_CONTENT_API_TOKEN,
      waitUntilOf(c),
    );
    if (!ok) return c.json({ error: "Unauthorized" }, 401);
    const settings = await getPublicSettings();
    return c.json(settings);
  } catch {
    return c.json({ error: "Failed to load public settings" }, 500);
  }
});

export default app;
