// Per-content taxonomy links — Hono port of
// packages/cms/src/categories.ts (ContentTaxonomyService) as used by
// apps/admin/src/actions/content.ts (setContentCategories /
// getContentCategories / setContentTags / getContentTags).
//
// Mounted at /api/admin/content-taxonomy (see routes/admin/index.ts).
//
// Fidelity notes:
// - Only "posts" has junction tables (post_categories / post_tags).
//   For every other content type the service is a no-op: GET returns
//   [] and POST returns { ok: true } without touching the DB —
//   preserved exactly.
// - POST replaces the links wholesale (delete + insert). The ids are
//   deduplicated first so a repeated id cannot violate the join's
//   composite primary key. The Neon HTTP driver has no transaction
//   support, so the replace runs as sequential statements.
// - GET returns the full category / tag rows (CategoryData / TagData),
//   exactly as the service returned them.
import { Hono } from "hono";
import { eq, inArray } from "drizzle-orm";
import {
  categories,
  postCategories,
  postTags,
  tags,
} from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

const app = new Hono<Env>();

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

function cleanIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || id === "") continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /:type/:id/categories — the content item's categories.
app.get("/:type/:id/categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    if (c.req.param("type") !== "posts") return c.json([]);
    const id = c.req.param("id");
    if (!UUID_RE.test(id)) return c.json({ error: "Invalid id" }, 400);
    const db = getApiDb();
    const rows = await db
      .select({ categoryId: postCategories.categoryId })
      .from(postCategories)
      .where(eq(postCategories.postId, id));
    const catIds = rows
      .map((r) => r.categoryId)
      .filter((v): v is string => typeof v === "string");
    if (catIds.length === 0) return c.json([]);
    const cats = await db
      .select()
      .from(categories)
      .where(inArray(categories.id, catIds));
    return c.json(cats);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST /:type/:id/categories { categoryIds } — replace the links.
app.post("/:type/:id/categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    if (c.req.param("type") !== "posts") return c.json({ ok: true });
    const id = c.req.param("id");
    if (!UUID_RE.test(id)) return c.json({ error: "Invalid id" }, 400);
    const body = (await c.req.json().catch(() => null)) as {
      categoryIds?: unknown;
    } | null;
    const categoryIds = cleanIds(body?.categoryIds);
    const db = getApiDb();
    await db.delete(postCategories).where(eq(postCategories.postId, id));
    if (categoryIds.length > 0) {
      await db
        .insert(postCategories)
        .values(
          categoryIds.map((catId) => ({ postId: id, categoryId: catId })),
        );
    }
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// GET /:type/:id/tags — the content item's tags.
app.get("/:type/:id/tags", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    if (c.req.param("type") !== "posts") return c.json([]);
    const id = c.req.param("id");
    if (!UUID_RE.test(id)) return c.json({ error: "Invalid id" }, 400);
    const db = getApiDb();
    const rows = await db
      .select({ tagId: postTags.tagId })
      .from(postTags)
      .where(eq(postTags.postId, id));
    const tagIds = rows
      .map((r) => r.tagId)
      .filter((v): v is string => typeof v === "string");
    if (tagIds.length === 0) return c.json([]);
    const tagRows = await db
      .select()
      .from(tags)
      .where(inArray(tags.id, tagIds));
    return c.json(tagRows);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST /:type/:id/tags { tagIds } — replace the links.
app.post("/:type/:id/tags", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    if (c.req.param("type") !== "posts") return c.json({ ok: true });
    const id = c.req.param("id");
    if (!UUID_RE.test(id)) return c.json({ error: "Invalid id" }, 400);
    const body = (await c.req.json().catch(() => null)) as {
      tagIds?: unknown;
    } | null;
    const tagIds = cleanIds(body?.tagIds);
    const db = getApiDb();
    await db.delete(postTags).where(eq(postTags.postId, id));
    if (tagIds.length > 0) {
      await db
        .insert(postTags)
        .values(tagIds.map((tagId) => ({ postId: id, tagId })));
    }
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
