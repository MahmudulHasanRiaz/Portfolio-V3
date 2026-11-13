// Admin venture media coverage (media_mentions) — split from ventures.ts
// (see index.ts). Hono port of the Next.js admin REST route
// apps/admin/src/app/api/ventures/[id]/media/route.ts.
// Mounted at /api/admin/ventures by routes/admin/index.ts.
import { Hono } from "hono";
import {
  createMediaMentionSchema,
  updateMediaMentionSchema,
  uuidSchema,
} from "@repo/validation";
import { count, eq, sql } from "drizzle-orm";
import { contentStatus, mediaMentions } from "@repo/database/schema";
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
import { errorMessage, slugify, stripServerManaged, type Env } from "./helpers";

const app = new Hono<Env>();

// ─── Venture media coverage (media_mentions) ─────────────────────────────────

app.get("/:id/media", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const { page, pageSize } = parsePagination(c);
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createMediaMentionSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const title = data.title as string | undefined;
    const sourceName = data.sourceName as string | undefined;
    if (!title?.trim() && !sourceName?.trim()) {
      return c.json({ error: "Title or source name is required" }, 400);
    }
    const slugBase =
      slugify(
        (data.slug as string | undefined) || title || "mention",
      ) || "mention";
    const publishedDate = (data.publishedDate as string | undefined) || null;
    const db = getApiDb();
    const values = {
      ventureId: id,
      title: title ?? null,
      slug: slugBase,
      sourceName: sourceName ?? null,
      sourceUrl: (data.sourceUrl as string | undefined) ?? null,
      publishedDate,
      summary: (data.summary as string | undefined) ?? null,
      isFeatured: (data.isFeatured as boolean | undefined) ?? false,
      status: ((data.status as string | undefined) ?? "draft") as (
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
    // NOTE (out of scope, left as-is): the mention is looked up by
    // mentionId alone, ignoring the :id venture — a mention from another
    // venture can be updated/deleted through this route. That is an
    // authorization fix, not a validation fix.
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    // mentionId is the lookup key, not a media-mention field, so it is
    // extracted (and UUID-checked) before schema validation strips it.
    const mentionIdRaw =
      (body.mentionId as string | undefined) ??
      (body.id as string | undefined);
    if (!mentionIdRaw) return c.json({ error: "mentionId required" }, 400);
    if (!uuidSchema.safeParse(mentionIdRaw).success) {
      return invalidParam(c, "mentionId");
    }
    const mentionId = mentionIdRaw;
    const v = validateBody(body, updateMediaMentionSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const db = getApiDb();
    const sets: Partial<typeof mediaMentions.$inferInsert> = {};
    if (data.title !== undefined) sets.title = data.title as string | null;
    if (data.slug !== undefined) sets.slug = data.slug as string;
    if (data.sourceName !== undefined) {
      sets.sourceName = data.sourceName as string | null;
    }
    if (data.sourceUrl !== undefined) {
      sets.sourceUrl = data.sourceUrl as string | null;
    }
    if (data.publishedDate !== undefined) {
      sets.publishedDate = (data.publishedDate as string | undefined) || null;
    }
    if (data.summary !== undefined) sets.summary = data.summary as string | null;
    if (data.isFeatured !== undefined) {
      sets.isFeatured = data.isFeatured as boolean | null;
    }
    if (data.status !== undefined) {
      sets.status = data.status as (typeof contentStatus.enumValues)[number];
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
    // NOTE (out of scope, left as-is): the mention is looked up by
    // mentionId alone, ignoring the :id venture — see PATCH above.
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    // The source takes the id from the body, falling back to ?mentionId=.
    // A bodyless/malformed body is treated as {} (as the source's
    // .json().catch(() => ({})) did), so ?mentionId= still works.
    const rawBody = await readJsonBody(c);
    const body: Record<string, unknown> = isRecord(rawBody) ? rawBody : {};
    const mentionId =
      (body.mentionId as string | undefined) ??
      (body.id as string | undefined) ??
      c.req.query("mentionId") ??
      undefined;
    if (!mentionId) return c.json({ error: "mentionId required" }, 400);
    if (!uuidSchema.safeParse(mentionId).success) {
      return invalidParam(c, "mentionId");
    }
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

export default app;
