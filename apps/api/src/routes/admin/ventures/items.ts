// Admin ventures CRUD — split from ventures.ts (see index.ts).
// Hono port of the Next.js admin REST routes
// apps/admin/src/app/api/ventures/route.ts and
// apps/admin/src/app/api/ventures/[id]/route.ts, plus
// apps/admin/src/app/api/ventures/[id]/products/route.ts.
// Mounted at /api/admin/ventures by routes/admin/index.ts.
//
// Fidelity notes:
// - Response shapes match the Next.js routes exactly: list returns
//   { ventures, total, page, pageSize, totalPages }; get/create/update
//   return the bare row; delete returns { success: true }. The sources
//   ran raw SQL (snake_case rows) through toCamel; direct Drizzle rows are
//   already keyed by the schema's camelCase property names, so no case
//   conversion is applied (toCamel is shallow, and nested jsonb values —
//   `socialLinks`, `metrics`, `videos`, `galleryImages` — keep their
//   keys untouched either way).
// - Create/update take the dashboard form body verbatim, exactly as the
//   @repo/entrepreneur VentureRepository did: camelCase keys are mapped to
//   table columns, empty-string foundedDate becomes NULL, `id` /
//   `createdAt` / `updatedAt` are never taken from the body, and unknown
//   keys are dropped (the source would have failed the SQL on an unknown
//   column instead — the admin UI only ever sends known fields). Array
//   values (videos / galleryImages) are jsonb; Drizzle serialises them,
//   as postgres.js did with an explicit ::jsonb cast in the source.
// - Create skips null values (so DB defaults apply, e.g. contentStatus
//   "draft", status "active"); update sets nulls, as in the repository.
//   A body with no updatable fields returns the existing row.
// - Delete removes the child rows first (products, timeline_events with
//   source_type='venture'), because no FKs point from them to ventures.
//   Media mentions FK to ventures with ON DELETE SET NULL and category
//   assignments cascade, so those need no cleanup here.
// - Products is list-only, exactly as the source route (GET only).
//
// Side effects (wired at cutover via lib/side-effects): the sources also
// (a) indexed / de-indexed the entity via SearchIndexerService,
// (b) dispatched the "venture_published" workflow trigger on create, and
// (c) purged the public site cache via purgePublicCache(["ventures", "home"]).
import { Hono } from "hono";
import { z } from "zod";
import {
  createVentureSchema,
  updateVentureSchema,
  uuidSchema,
} from "@repo/validation";
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  or,
} from "drizzle-orm";
import {
  contentStatus,
  products,
  timelineEvents,
  ventureCategoryAssignments,
  ventureStatus,
  ventures,
} from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth, unauthorized } from "../../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  parsePagination,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import {
  deleteSearchEntity,
  dispatchTrigger,
  indexSearchEntity,
  purgePublicCache,
  waitUntilOf,
} from "../../../lib/side-effects";
import { errorMessage, stripServerManaged, type Env } from "./helpers";

const app = new Hono<Env>();

// ─── Validation ──────────────────────────────────────────────────────────────
// - List-query enums (same values as the shared venture schemas).
const ventureStatusSchema = z.enum(["active", "paused", "acquired", "closed"]);
const ventureContentStatusSchema = z.enum(["draft", "published", "archived"]);

// Columns of the ventures table, keyed by their camelCase property name —
// used as the allowlist for create/update bodies.
const VENTURE_COLUMNS = getTableColumns(ventures);

/**
 * Map a dashboard-form body to ventures insert/update values.
 * Mirrors VentureRepository.create/update: empty-string foundedDate ->
 * null, `id`/`createdAt`/`updatedAt` skipped. With skipNulls (create)
 * null values are dropped so DB defaults apply; without it (update)
 * nulls are set, as in the repository.
 */
function ventureFields(
  body: Record<string, unknown>,
  skipNulls: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, rawValue] of Object.entries(body)) {
    if (key === "id" || key === "createdAt" || key === "updatedAt") continue;
    if (!(key in VENTURE_COLUMNS)) continue;
    let value = rawValue;
    if (key === "foundedDate" && value === "") value = null;
    if (value === undefined) continue;
    if (value === null && skipNulls) continue;
    out[key] = value;
  }
  return out;
}

// ─── Ventures ────────────────────────────────────────────────────────────────

app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const search = c.req.query("search") ?? undefined;
    const status = c.req.query("status") ?? undefined;
    const contentStatusParam = c.req.query("contentStatus") ?? undefined;
    const categoryId = c.req.query("categoryId") ?? undefined;
    const industry = c.req.query("industry") ?? undefined;
    if (search !== undefined && search.length > 255) {
      return c.json({ error: "search must be at most 255 characters" }, 400);
    }
    if (status !== undefined && !ventureStatusSchema.safeParse(status).success) {
      return c.json({ error: "Invalid status" }, 400);
    }
    if (
      contentStatusParam !== undefined &&
      !ventureContentStatusSchema.safeParse(contentStatusParam).success
    ) {
      return c.json({ error: "Invalid contentStatus" }, 400);
    }
    if (categoryId !== undefined && !uuidSchema.safeParse(categoryId).success) {
      return c.json({ error: "Invalid categoryId" }, 400);
    }
    if (industry !== undefined && industry.length > 100) {
      return c.json({ error: "industry must be at most 100 characters" }, 400);
    }
    const { page, pageSize } = parsePagination(c);
    const offset = (page - 1) * pageSize;

    const db = getApiDb();
    const where = and(
      search
        ? or(
            ilike(ventures.name, `%${search}%`),
            ilike(ventures.description, `%${search}%`),
          )
        : undefined,
      status
        ? eq(ventures.status, status as (typeof ventureStatus.enumValues)[number])
        : undefined,
      contentStatusParam
        ? eq(
            ventures.contentStatus,
            contentStatusParam as (typeof contentStatus.enumValues)[number],
          )
        : undefined,
      industry ? eq(ventures.industry, industry) : undefined,
    );

    let total: number;
    let rows: (typeof ventures.$inferSelect)[];
    if (categoryId) {
      // The source joins venture_category_assignments for the category
      // filter (a venture has at most one assignment per category — the
      // PK is composite — so the count is not inflated).
      const whereWithCategory = and(
        where,
        eq(ventureCategoryAssignments.categoryId, categoryId),
      );
      const [countRow] = await db
        .select({ total: count() })
        .from(ventures)
        .innerJoin(
          ventureCategoryAssignments,
          eq(ventureCategoryAssignments.ventureId, ventures.id),
        )
        .where(whereWithCategory);
      total = countRow?.total ?? 0;
      const joined = await db
        .select()
        .from(ventures)
        .innerJoin(
          ventureCategoryAssignments,
          eq(ventureCategoryAssignments.ventureId, ventures.id),
        )
        .where(whereWithCategory)
        .orderBy(desc(ventures.createdAt))
        .limit(pageSize)
        .offset(offset);
      rows = joined.map((r) => r.ventures);
    } else {
      const [countRow] = await db
        .select({ total: count() })
        .from(ventures)
        .where(where);
      total = countRow?.total ?? 0;
      rows = await db
        .select()
        .from(ventures)
        .where(where)
        .orderBy(desc(ventures.createdAt))
        .limit(pageSize)
        .offset(offset);
    }

    return c.json({
      ventures: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch ventures") }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createVentureSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const db = getApiDb();
    const [row] = await db
      .insert(ventures)
      .values({
        ...ventureFields(data, true),
        createdBy: user.id,
      } as typeof ventures.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create venture" }, 500);
    void indexSearchEntity(db, "venture", row.id, c.env, waitUntilOf(c));
    await dispatchTrigger(db, "venture_published", row.id, { ...row, triggeredBy: user.id });
    void purgePublicCache(c.env, ["ventures", "home"], waitUntilOf(c));
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to create venture") }, 500);
  }
});

// ─── Venture by id ───────────────────────────────────────────────────────────

app.get("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(ventures)
      .where(eq(ventures.id, id))
      .limit(1);
    if (!row) return c.json({ error: "Venture not found" }, 404);
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch venture") }, 500);
  }
});

app.patch("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateVentureSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const db = getApiDb();
    const values = ventureFields(data, false);
    if (Object.keys(values).length === 0) {
      // No updatable fields — the repository returns the existing row.
      const [existing] = await db
        .select()
        .from(ventures)
        .where(eq(ventures.id, id))
        .limit(1);
      if (!existing) return c.json({ error: "Venture not found" }, 404);
      return c.json(existing);
    }
    const [row] = await db
      .update(ventures)
      .set({
        ...values,
        updatedAt: new Date(),
      } as typeof ventures.$inferInsert)
      .where(eq(ventures.id, id))
      .returning();
    if (!row) return c.json({ error: "Venture not found" }, 404);
    void indexSearchEntity(db, "venture", row.id, c.env, waitUntilOf(c));
    void purgePublicCache(c.env, ["ventures", "home"], waitUntilOf(c));
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to update venture") }, 500);
  }
});

app.delete("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    // No FKs point from products / timeline_events to ventures, so delete
    // the children first — otherwise a deleted venture leaves orphaned
    // products and timeline rows behind. (Media mentions FK to ventures
    // with ON DELETE SET NULL; category assignments cascade.)
    await db.delete(products).where(eq(products.ventureId, id));
    await db
      .delete(timelineEvents)
      .where(
        and(
          eq(timelineEvents.sourceType, "venture"),
          eq(timelineEvents.sourceId, id),
        ),
      );
    const [deleted] = await db
      .delete(ventures)
      .where(eq(ventures.id, id))
      .returning({ id: ventures.id });
    if (!deleted) return c.json({ error: "Venture not found" }, 404);
    void deleteSearchEntity(db, "venture", id, waitUntilOf(c));
    void purgePublicCache(c.env, ["ventures", "home"], waitUntilOf(c));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to delete venture") }, 500);
  }
});

// ─── Venture products (list only — the source route has GET only) ────────────

app.get("/:id/products", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const { page, pageSize } = parsePagination(c, { defaultPageSize: 50 });
    const offset = (page - 1) * pageSize;
    const db = getApiDb();
    const where = eq(products.ventureId, id);
    const [countRow] = await db
      .select({ total: count() })
      .from(products)
      .where(where);
    const total = countRow?.total ?? 0;
    const rows = await db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(pageSize)
      .offset(offset);
    return c.json({
      products: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch products") }, 500);
  }
});

export default app;
