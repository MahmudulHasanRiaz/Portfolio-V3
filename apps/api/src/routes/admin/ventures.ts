// Admin ventures CRUD — Hono port of the Next.js admin REST routes
// apps/admin/src/app/api/ventures/route.ts and
// apps/admin/src/app/api/ventures/[id]/route.ts, plus the sub-resources
// apps/admin/src/app/api/ventures/categories/route.ts,
// apps/admin/src/app/api/ventures/categories/[id]/route.ts and
// apps/admin/src/app/api/ventures/[id]/{categories,media,products,timeline}/route.ts.
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
// - setCategories is sequential (delete all assignments, then insert the
//   new ones): the source ran it in one postgres.js transaction, but the
//   neon-http driver throws on db.transaction() ("No transactions support
//   in neon-http driver"), so there is no atomic equivalent on Workers.
// - Timeline IS implemented: plain table CRUD on timeline_events
//   (list / add / delete by eventId in the body), same as the source.
//   Products is list-only, exactly as the source route (GET only).
//
// Side effects (wired at cutover via lib/side-effects): the sources also
// (a) indexed / de-indexed the entity via SearchIndexerService,
// (b) dispatched the "venture_published" workflow trigger on create, and
// (c) purged the public site cache via purgePublicCache(["ventures", "home"]).
import { Hono } from "hono";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import {
  contentStatus,
  mediaMentions,
  products,
  timelineEvents,
  ventureCategories,
  ventureCategoryAssignments,
  ventureStatus,
  ventures,
} from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth, unauthorized } from "../../lib/admin-auth";
import { deleteSearchEntity, dispatchTrigger, indexSearchEntity, purgePublicCache, waitUntilOf } from "../../lib/side-effects";

const app = new Hono();

// Columns of the ventures table, keyed by their camelCase property name —
// used as the allowlist for create/update bodies.
const VENTURE_COLUMNS = getTableColumns(ventures);

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function parsePage(query: (name: string) => string | undefined): {
  page: number;
  pageSize: number;
} {
  const page = parseInt(query("page") ?? "1", 10);
  const pageSize = parseInt(query("pageSize") ?? "20", 10);
  return { page, pageSize };
}

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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
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
    const { page, pageSize } = parsePage((name) => c.req.query(name));
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
    const body = (await c.req.json()) as Record<string, unknown>;
    const db = getApiDb();
    const [row] = await db
      .insert(ventures)
      .values({
        ...ventureFields(body, true),
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

// ─── Venture categories ──────────────────────────────────────────────────────
// Registered before /:id so the static /categories path is never shadowed
// by the :id parameter.

app.get("/categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const db = getApiDb();
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
    const body = (await c.req.json()) as Record<string, unknown>;
    const name = body.name as string | undefined;
    const slug =
      (body.slug as string | undefined)?.trim() ||
      (name ? slugify(name) : "");
    if (!name?.trim() || !slug) {
      return c.json({ error: "Category name is required" }, 400);
    }
    const db = getApiDb();
    const [row] = await db
      .insert(ventureCategories)
      .values({
        name,
        slug,
        description: (body.description as string | undefined) ?? null,
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
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const db = getApiDb();
    const sets: Partial<typeof ventureCategories.$inferInsert> = {};
    if (body.name !== undefined) sets.name = body.name as string | null;
    if (body.slug !== undefined) sets.slug = body.slug as string;
    if (body.description !== undefined) {
      sets.description = body.description as string | null;
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
    const id = c.req.param("id");
    const db = getApiDb();
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

// ─── Venture by id ───────────────────────────────────────────────────────────

app.get("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
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
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const db = getApiDb();
    const values = ventureFields(body, false);
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
    const id = c.req.param("id");
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
    const id = c.req.param("id");
    const db = getApiDb();
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
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const categoryIds = body.categoryIds as string[] | undefined;
    if (!Array.isArray(categoryIds)) {
      return c.json({ error: "categoryIds must be an array" }, 400);
    }
    const db = getApiDb();
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

// ─── Venture media coverage (media_mentions) ─────────────────────────────────

app.get("/:id/media", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    const { page, pageSize } = parsePage((name) => c.req.query(name));
    const offset = (page - 1) * pageSize;
    const db = getApiDb();
    const [countRow] = await db
      .select({ total: count() })
      .from(mediaMentions)
      .where(eq(mediaMentions.ventureId, id));
    const total = countRow?.total ?? 0;
    const rows = await db
      .select()
      .from(mediaMentions)
      .where(eq(mediaMentions.ventureId, id))
      // ORDER BY published_date DESC NULLS LAST — the NULLS LAST needs
      // explicit SQL: plain desc() is NULLS FIRST in Postgres.
      .orderBy(sql`${mediaMentions.publishedDate} DESC NULLS LAST`)
      .limit(pageSize)
      .offset(offset);
    return c.json({
      mentions: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch media coverage") }, 500);
  }
});

app.post("/:id/media", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const title = body.title as string | undefined;
    const sourceName = body.sourceName as string | undefined;
    if (!title?.trim() && !sourceName?.trim()) {
      return c.json({ error: "Title or source name is required" }, 400);
    }
    const slugBase =
      slugify(
        (body.slug as string | undefined) || title || "mention",
      ) || "mention";
    const publishedDate = (body.publishedDate as string | undefined) || null;
    const db = getApiDb();
    const values = {
      ventureId: id,
      title: title ?? null,
      slug: slugBase,
      sourceName: sourceName ?? null,
      sourceUrl: (body.sourceUrl as string | undefined) ?? null,
      publishedDate,
      summary: (body.summary as string | undefined) ?? null,
      isFeatured: (body.isFeatured as boolean | undefined) ?? false,
      status: ((body.status as string | undefined) ?? "draft") as (
        typeof contentStatus.enumValues
      )[number],
    };
    let row: typeof mediaMentions.$inferSelect | undefined;
    try {
      [row] = await db.insert(mediaMentions).values(values).returning();
    } catch (err) {
      // Slug is unique — retry once with a random suffix, as the source did.
      if ((err as { code?: unknown })?.code === "23505") {
        [row] = await db
          .insert(mediaMentions)
          .values({ ...values, slug: `${slugBase}-${crypto.randomUUID().slice(0, 6)}` })
          .returning();
      } else {
        throw err;
      }
    }
    if (!row) return c.json({ error: "Failed to add media coverage" }, 500);
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to add media coverage") }, 500);
  }
});

app.patch("/:id/media", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const mentionId = (body.mentionId as string | undefined) ??
      (body.id as string | undefined);
    if (!mentionId) return c.json({ error: "mentionId required" }, 400);
    const db = getApiDb();
    const sets: Partial<typeof mediaMentions.$inferInsert> = {};
    if (body.title !== undefined) sets.title = body.title as string | null;
    if (body.slug !== undefined) sets.slug = body.slug as string;
    if (body.sourceName !== undefined) {
      sets.sourceName = body.sourceName as string | null;
    }
    if (body.sourceUrl !== undefined) {
      sets.sourceUrl = body.sourceUrl as string | null;
    }
    if (body.publishedDate !== undefined) {
      sets.publishedDate = (body.publishedDate as string | undefined) || null;
    }
    if (body.summary !== undefined) sets.summary = body.summary as string | null;
    if (body.isFeatured !== undefined) {
      sets.isFeatured = body.isFeatured as boolean | null;
    }
    if (body.status !== undefined) {
      sets.status = body.status as (typeof contentStatus.enumValues)[number];
    }
    if (Object.keys(sets).length === 0) {
      const [existing] = await db
        .select()
        .from(mediaMentions)
        .where(eq(mediaMentions.id, mentionId))
        .limit(1);
      if (!existing) return c.json({ error: "Media mention not found" }, 404);
      return c.json(existing);
    }
    const [row] = await db
      .update(mediaMentions)
      .set(sets)
      .where(eq(mediaMentions.id, mentionId))
      .returning();
    if (!row) return c.json({ error: "Media mention not found" }, 404);
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to update media coverage") }, 500);
  }
});

app.delete("/:id/media", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    // The source takes the id from the body, falling back to ?mentionId=.
    const body = (await c.req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const mentionId =
      (body.mentionId as string | undefined) ??
      (body.id as string | undefined) ??
      c.req.query("mentionId") ??
      undefined;
    if (!mentionId) return c.json({ error: "mentionId required" }, 400);
    const db = getApiDb();
    const [deleted] = await db
      .delete(mediaMentions)
      .where(eq(mediaMentions.id, mentionId))
      .returning({ id: mediaMentions.id });
    if (!deleted) return c.json({ error: "Media mention not found" }, 404);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to delete media coverage") }, 500);
  }
});

// ─── Venture products (list only — the source route has GET only) ────────────

app.get("/:id/products", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    const page = parseInt(c.req.query("page") ?? "1", 10);
    const pageSize = parseInt(c.req.query("pageSize") ?? "50", 10);
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

// ─── Venture timeline ────────────────────────────────────────────────────────

app.get("/:id/timeline", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    const db = getApiDb();
    const rows = await db
      .select()
      .from(timelineEvents)
      .where(
        and(
          eq(timelineEvents.sourceType, "venture"),
          eq(timelineEvents.sourceId, id),
        ),
      )
      // ORDER BY event_date DESC NULLS LAST, sort_order ASC — the NULLS
      // LAST needs explicit SQL: plain desc() is NULLS FIRST in Postgres.
      .orderBy(
        sql`${timelineEvents.eventDate} DESC NULLS LAST`,
        asc(timelineEvents.sortOrder),
      );
    return c.json(rows);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch timeline events") }, 500);
  }
});

app.post("/:id/timeline", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const db = getApiDb();
    const [row] = await db
      .insert(timelineEvents)
      .values({
        sourceType: "venture",
        sourceId: id,
        eventType: (body.eventType as string | undefined) ?? null,
        title: (body.title as string | undefined) ?? null,
        description: (body.description as string | undefined) ?? null,
        eventDate: (body.eventDate as string | undefined) ?? null,
        icon: (body.icon as string | undefined) ?? null,
        url: (body.url as string | undefined) ?? null,
      })
      .returning();
    if (!row) return c.json({ error: "Failed to add timeline event" }, 500);
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to add timeline event") }, 500);
  }
});

app.delete("/:id/timeline", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const body = (await c.req.json()) as { eventId?: unknown };
    const eventId = body.eventId as string | undefined;
    if (!eventId) return c.json({ error: "eventId required" }, 400);
    const db = getApiDb();
    const [deleted] = await db
      .delete(timelineEvents)
      .where(eq(timelineEvents.id, eventId))
      .returning({ id: timelineEvents.id });
    if (!deleted) return c.json({ error: "Timeline event not found" }, 404);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to delete timeline event") }, 500);
  }
});

export default app;
