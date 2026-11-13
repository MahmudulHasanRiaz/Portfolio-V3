// Admin releases CRUD — split from releases.ts.
// Routes: GET /, POST /, GET /:id, PATCH /:id, DELETE /:id.
// Mounted at /api/admin/releases by routes/admin/index.ts (via releases/index.ts).
import { Hono } from "hono";
import { z } from "zod";
import {
  createReleaseSchema,
  updateReleaseSchema,
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
  releaseLyrics,
  releasePlatforms,
  releaseType,
  releaseVideos,
  releases,
  timelineEvents,
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
import { deleteSearchEntity, dispatchTrigger, indexSearchEntity, purgePublicCache, waitUntilOf } from "../../../lib/side-effects";
import { errorMessage, stripServerManaged } from "./helpers";

const app = new Hono();

// ─── Validation ──────────────────────────────────────────────────────────────
// - List-query enums (same values as the shared release schemas).
const releaseStatusSchema = z.enum(["draft", "published", "archived"]);
const releaseTypeSchema = z.enum([
  "nasheed",
  "tilawat",
  "acting",
  "podcast",
  "interview",
  "documentary",
]);

// Columns of the releases table, keyed by their camelCase property name —
// used as the allowlist for create/update bodies.
const RELEASE_COLUMNS = getTableColumns(releases);

/**
 * Map a dashboard-form body to releases insert/update values.
 * Mirrors ReleaseRepository.create/update: `format` -> `releaseFormat`,
 * empty-string releaseDate -> null, `id`/`createdAt`/`updatedAt` skipped.
 * With skipNulls (create) null values are dropped so DB defaults apply;
 * without it (update) nulls are set, as in the repository.
 */
function releaseFields(
  body: Record<string, unknown>,
  skipNulls: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, rawValue] of Object.entries(body)) {
    if (key === "id" || key === "createdAt" || key === "updatedAt") continue;
    // The dashboard sends `format`; the column is `release_format`.
    const prop = key === "format" ? "releaseFormat" : key;
    if (!(prop in RELEASE_COLUMNS)) continue;
    let value = rawValue;
    if (prop === "releaseDate" && value === "") value = null;
    if (value === undefined) continue;
    if (value === null && skipNulls) continue;
    out[prop] = value;
  }
  return out;
}

// ─── Releases ────────────────────────────────────────────────────────────────

app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const search = c.req.query("search") ?? undefined;
    const status = c.req.query("status") ?? undefined;
    const type = c.req.query("type") ?? undefined;
    const format = c.req.query("format") ?? undefined;
    if (search !== undefined && search.length > 255) {
      return c.json({ error: "search must be at most 255 characters" }, 400);
    }
    if (status !== undefined && !releaseStatusSchema.safeParse(status).success) {
      return c.json({ error: "Invalid status" }, 400);
    }
    if (type !== undefined && !releaseTypeSchema.safeParse(type).success) {
      return c.json({ error: "Invalid type" }, 400);
    }
    if (format !== undefined && format.length > 50) {
      return c.json({ error: "format must be at most 50 characters" }, 400);
    }
    const { page, pageSize } = parsePagination(c);
    const offset = (page - 1) * pageSize;

    const db = getApiDb();
    const where = and(
      search
        ? or(
            ilike(releases.title, `%${search}%`),
            ilike(releases.description, `%${search}%`),
          )
        : undefined,
      status
        ? eq(releases.status, status as (typeof contentStatus.enumValues)[number])
        : undefined,
      type
        ? eq(releases.type, type as (typeof releaseType.enumValues)[number])
        : undefined,
      format ? eq(releases.releaseFormat, format) : undefined,
    );

    const [countRow] = await db
      .select({ total: count() })
      .from(releases)
      .where(where);
    const total = countRow?.total ?? 0;
    const rows = await db
      .select()
      .from(releases)
      .where(where)
      .orderBy(desc(releases.createdAt))
      .limit(pageSize)
      .offset(offset);

    return c.json({
      releases: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch releases") }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    // The dashboard sends `format`; the schema (and column) is
    // `releaseFormat` — alias before validation so it is not stripped.
    if (body.format !== undefined && body.releaseFormat === undefined) {
      body.releaseFormat = body.format;
    }
    delete body.format;
    const v = validateBody(body, createReleaseSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const db = getApiDb();
    const [row] = await db
      .insert(releases)
      .values({
        ...releaseFields(data, true),
        createdBy: user.id,
      } as typeof releases.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create release" }, 500);
    void indexSearchEntity(db, "release", row.id, c.env, waitUntilOf(c));
    await dispatchTrigger(db, "release_published", row.id, { ...row, triggeredBy: user.id });
    void purgePublicCache(c.env, ["releases", "home"], waitUntilOf(c));
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to create release") }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(releases)
      .where(eq(releases.id, id))
      .limit(1);
    if (!row) return c.json({ error: "Release not found" }, 404);
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch release") }, 500);
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
    // The dashboard sends `format`; the schema (and column) is
    // `releaseFormat` — alias before validation so it is not stripped.
    if (body.format !== undefined && body.releaseFormat === undefined) {
      body.releaseFormat = body.format;
    }
    delete body.format;
    const v = validateBody(body, updateReleaseSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const db = getApiDb();
    const values = releaseFields(data, false);
    if (Object.keys(values).length === 0) {
      // No updatable fields — the repository returns the existing row.
      const [existing] = await db
        .select()
        .from(releases)
        .where(eq(releases.id, id))
        .limit(1);
      if (!existing) return c.json({ error: "Release not found" }, 404);
      return c.json(existing);
    }
    const [row] = await db
      .update(releases)
      .set({
        ...values,
        updatedAt: new Date(),
      } as typeof releases.$inferInsert)
      .where(eq(releases.id, id))
      .returning();
    if (!row) return c.json({ error: "Release not found" }, 404);
    void indexSearchEntity(db, "release", row.id, c.env, waitUntilOf(c));
    void purgePublicCache(c.env, ["releases", "home"], waitUntilOf(c));
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to update release") }, 500);
  }
});

app.delete("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    // No FKs point from the child tables to releases, so delete the
    // children first — otherwise a deleted release leaves orphaned rows.
    await db.delete(releasePlatforms).where(eq(releasePlatforms.releaseId, id));
    await db.delete(releaseVideos).where(eq(releaseVideos.releaseId, id));
    await db.delete(releaseLyrics).where(eq(releaseLyrics.releaseId, id));
    await db
      .delete(timelineEvents)
      .where(
        and(
          eq(timelineEvents.sourceType, "release"),
          eq(timelineEvents.sourceId, id),
        ),
      );
    const [deleted] = await db
      .delete(releases)
      .where(eq(releases.id, id))
      .returning({ id: releases.id });
    if (!deleted) return c.json({ error: "Release not found" }, 404);
    void deleteSearchEntity(db, "release", id, waitUntilOf(c));
    void purgePublicCache(c.env, ["releases", "home"], waitUntilOf(c));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to delete release") }, 500);
  }
});

export default app;
