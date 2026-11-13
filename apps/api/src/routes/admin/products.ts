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
import { z } from "zod";
import { slugSchema, uuidSchema } from "@repo/validation";
import { products } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  parsePagination,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../lib/validate";
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

// Local schemas — no product schema exists in @repo/validation.
// Enums are the DB enums (productStatus active|deprecated,
// contentStatus draft|published|archived). launchDate accepts a full
// datetime OR a plain YYYY-MM-DD date (the column is a date; the admin
// UI sends plain dates) — the datetime arm is the spec'd .datetime().
// The schema has no id/createdBy/createdAt/updatedAt, so those can
// never be client-set (Zod strips unknown keys); createdBy is stamped
// from the session.
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugSchema.optional(),
  ventureId: uuidSchema.optional(),
  status: z.enum(["active", "deprecated"]).optional(),
  contentStatus: z.enum(["draft", "published", "archived"]).optional(),
  url: z.string().url().optional(),
  launchDate: z
    .union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .optional(),
  isFeatured: z.boolean().optional(),
  description: z.string().max(2000).optional(),
  media: z.array(z.unknown()).optional(),
  highlights: z.array(z.unknown()).optional(),
});
const updateProductSchema = createProductSchema.partial();

/** Validated data, restricted to keys the client actually sent, so a
 *  PATCH never writes a field the client omitted. */
function sentFields<T extends Record<string, unknown>>(
  data: T,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key in body) out[key] = value;
  }
  return out;
}

// GET / — list (ProductRepository.list)
app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const ventureId = c.req.query("ventureId") || undefined;
    if (ventureId !== undefined && !uuidSchema.safeParse(ventureId).success) {
      return c.json({ error: "Invalid uuid" }, 400);
    }
    const { page, pageSize } = parsePagination(c, { defaultPageSize: 50 });
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const v = validateBody(body, createProductSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    const [row] = await db
      .insert(products)
      .values({
        ...pickFields(v.data, PRODUCT_FIELDS),
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const v = validateBody(body, updateProductSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    const [row] = await db
      .update(products)
      .set(pickFields(sentFields(v.data, body), PRODUCT_FIELDS))
      .where(eq(products.id, id))
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
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
