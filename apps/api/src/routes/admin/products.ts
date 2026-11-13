// Admin products CRUD — Hono port of
// apps/admin/src/app/api/products/route.ts and
// apps/admin/src/app/api/products/[id]/route.ts.
// Mounted at /api/admin/products (see routes/admin/index.ts).
//
// Fidelity notes:
// - Response shapes match the originals: list returns
//   { products, total, page, pageSize, totalPages }; get/create/update
//   return the bare row; delete returns { success: true }.
// - The original repo used raw SQL (SELECT *); Drizzle returns camelCase
//   rows, matching what the original's toCamel() produced.
// - Create stamps createdBy from the session user (never from the body),
//   as in the original; update never touches id/createdAt/createdBy.
// - The original passed the whole body through to the repo; here the
//   known product columns are allowlisted (the admin UI sends only
//   these), matching the other Hono routers' Zod-stripping precedent.
//
// Search-index side effects (wired at cutover via lib/side-effects):
// the original also called SearchIndexerService indexEntity("product", id)
// on create/update and deleteEntity on delete.
import { Hono } from "hono";
import { count, desc, eq } from "drizzle-orm";
import { products } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import { deleteSearchEntity, indexSearchEntity, waitUntilOf } from "../../lib/side-effects";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    PUBLIC_SITE_URL?: string;
    CACHE_INVALIDATE_SECRET?: string;
  };
};

const app = new Hono<Env>();

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

const PRODUCT_FIELDS = [
  "ventureId",
  "name",
  "slug",
  "description",
  "launchDate",
  "url",
  "status",
  "isFeatured",
  "contentStatus",
  "media",
  "highlights",
] as const;

function pickFields(
  body: Record<string, unknown>,
  allowed: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

// GET / — list (ProductRepository.list)
app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const ventureId = c.req.query("ventureId");
    const page = Number(c.req.query("page")) || 1;
    const pageSize = Number(c.req.query("pageSize")) || 50;
    const where = ventureId ? eq(products.ventureId, ventureId) : undefined;
    const [countResult] = await db
      .select({ count: count() })
      .from(products)
      .where(where);
    const total = Number(countResult?.count ?? 0);
    const rows = await db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({
      products: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST / — create (ProductRepository.create)
app.post("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const db = getApiDb();
    const [row] = await db
      .insert(products)
      .values({
        ...pickFields(body, PRODUCT_FIELDS),
        createdBy: user.id,
      } as typeof products.$inferInsert)
      .returning();
    if (row) {
      void indexSearchEntity(db, "product", row.id, c.env, waitUntilOf(c));
    }
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// GET /:id — one product (ProductRepository.getById)
app.get("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.id, c.req.param("id")))
      .limit(1);
    if (!row) return c.json({ error: "Product not found" }, 404);
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// PATCH /:id — update (ProductRepository.update)
app.patch("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const db = getApiDb();
    const [row] = await db
      .update(products)
      .set(pickFields(body, PRODUCT_FIELDS))
      .where(eq(products.id, c.req.param("id")))
      .returning();
    if (!row) return c.json({ error: "Product not found" }, 404);
    void indexSearchEntity(db, "product", row.id, c.env, waitUntilOf(c));
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// DELETE /:id — delete (ProductRepository.delete)
app.delete("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const id = c.req.param("id");
    const deleted = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    if (deleted.length === 0) {
      return c.json({ error: "Product not found" }, 404);
    }
    void deleteSearchEntity(db, "product", id, waitUntilOf(c));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
