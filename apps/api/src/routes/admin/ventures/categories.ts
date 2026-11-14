// Admin venture categories — split from ventures.ts (see index.ts).
// Hono port of the Next.js admin REST routes
// apps/admin/src/app/api/ventures/categories/route.ts,
// apps/admin/src/app/api/ventures/categories/[id]/route.ts and
// apps/admin/src/app/api/ventures/[id]/categories/route.ts.
// Mounted at /api/admin/ventures by routes/admin/index.ts.
import { Hono } from "hono";
import { z } from "zod";
import { slugSchema, uuidSchema } from "@repo/validation";
import { asc, eq } from "drizzle-orm";
import {
  ventureCategories,
  ventureCategoryAssignments,
} from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth, unauthorized } from "../../../lib/admin-auth";
import { ensureVentureCategories } from "../../../lib/ensure-schema";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import { errorMessage, slugify, stripServerManaged, type Env } from "./helpers";

const app = new Hono<Env>();

// ─── Validation ──────────────────────────────────────────────────────────────
// Local schemas (finance.ts precedent): venture categories have no shared
// @repo/validation schema. Create requires `name`; update is its partial
// (PATCH sets only the fields sent, as before).
const createVentureCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugSchema.optional(),
  description: z.string().optional(),
});
const updateVentureCategorySchema = createVentureCategorySchema.partial();
const setVentureCategoriesSchema = z.object({
  categoryIds: z.array(uuidSchema).min(0).max(100),
});

// ─── Venture categories ──────────────────────────────────────────────────────
// Registered before /:id so the static /categories path is never shadowed
// by the :id parameter.

app.get("/categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const db = getApiDb();
    await ensureVentureCategories(db);
    const rows = await db
      .select()
      .from(ventureCategories)
      .orderBy(asc(ventureCategories.name));
    return c.json(rows);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch categories") }, 500);
  }
});

app.post("/categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createVentureCategorySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const name = data.name;
    const slug = data.slug?.trim() || slugify(name);
    if (!name?.trim() || !slug) {
      return c.json({ error: "Category name is required" }, 400);
    }
    const db = getApiDb();
    await ensureVentureCategories(db);
    const [row] = await db
      .insert(ventureCategories)
      .values({
        name,
        slug,
        description: data.description ?? null,
      })
      .returning();
    if (!row) return c.json({ error: "Failed to create category" }, 500);
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to create category") }, 500);
  }
});

app.patch("/categories/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateVentureCategorySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const db = getApiDb();
    await ensureVentureCategories(db);
    const sets: Partial<typeof ventureCategories.$inferInsert> = {};
    if (data.name !== undefined) sets.name = data.name as string | null;
    if (data.slug !== undefined) sets.slug = data.slug as string;
    if (data.description !== undefined) {
      sets.description = data.description as string | null;
    }
    if (Object.keys(sets).length === 0) {
      // The repository returns the existing row when nothing is set.
      const [existing] = await db
        .select()
        .from(ventureCategories)
        .where(eq(ventureCategories.id, id))
        .limit(1);
      if (!existing) return c.json({ error: "Category not found" }, 404);
      return c.json(existing);
    }
    const [row] = await db
      .update(ventureCategories)
      .set(sets)
      .where(eq(ventureCategories.id, id))
      .returning();
    if (!row) return c.json({ error: "Category not found" }, 404);
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to update category") }, 500);
  }
});

app.delete("/categories/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    await ensureVentureCategories(db);
    const [deleted] = await db
      .delete(ventureCategories)
      .where(eq(ventureCategories.id, id))
      .returning({ id: ventureCategories.id });
    if (!deleted) return c.json({ error: "Category not found" }, 404);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to delete category") }, 500);
  }
});

// ─── Venture ↔ category assignments ──────────────────────────────────────────

async function getVentureCategories(db: ReturnType<typeof getApiDb>, ventureId: string) {
  return db
    .select({
      id: ventureCategories.id,
      name: ventureCategories.name,
      slug: ventureCategories.slug,
    })
    .from(ventureCategoryAssignments)
    .innerJoin(
      ventureCategories,
      eq(ventureCategoryAssignments.categoryId, ventureCategories.id),
    )
    .where(eq(ventureCategoryAssignments.ventureId, ventureId))
    .orderBy(asc(ventureCategories.name));
}

app.get("/:id/categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    await ensureVentureCategories(db);
    const categories = await getVentureCategories(db, id);
    return c.json(categories);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch categories") }, 500);
  }
});

app.post("/:id/categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, setVentureCategoriesSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const categoryIds = v.data.categoryIds;
    const db = getApiDb();
    await ensureVentureCategories(db);
    // NOTE: the source ran this in one postgres.js transaction. The
    // neon-http driver has no transaction support (db.transaction()
    // throws), so this runs as sequential statements instead — a failure
    // part-way leaves a partial assignment set. There is no atomic
    // equivalent on Workers; re-check assignments after a failed call.
    await db
      .delete(ventureCategoryAssignments)
      .where(eq(ventureCategoryAssignments.ventureId, id));
    for (const catId of categoryIds) {
      await db.insert(ventureCategoryAssignments).values({
        ventureId: id,
        categoryId: catId,
      });
    }
    const categories = await getVentureCategories(db, id);
    return c.json(categories, 200);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to set categories") }, 500);
  }
});

export default app;
