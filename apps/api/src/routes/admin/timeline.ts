// Timeline events — Hono port of packages/cms/src/timeline.ts
// (TimelineEventService) as used by apps/admin/src/actions/content.ts
// (listTimelineEvents / createTimelineEvent / updateTimelineEvent /
// deleteTimelineEvent).
//
// Mounted at /api/admin/timeline-events (see routes/admin/index.ts).
//
// Fidelity notes:
// - GET returns { items, pagination } (page 1 / pageSize 50 defaults),
//   ordered by eventDate desc, sortOrder asc — exactly what the
//   action returned.
// - POST / PUT return the bare row; PUT throws "Timeline event not
//   found" (404) when the id does not exist, exactly as the service
//   did. DELETE returns { ok: true } (the action returned void).
// - The eventDate column is a pg `date`, so Drizzle returns it as a
//   YYYY-MM-DD string — matching the TimelineEventData shape
//   (eventDate: string | null). createdAt serializes to an ISO string.
// - Search indexing: create/update index the "timeline_event" entity
//   and delete de-indexes it, mirroring TimelineEventService
//   (best-effort via lib/side-effects — the timeline_event loader was
//   added there for this).
import { Hono } from "hono";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { timelineEvents } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import {
  deleteSearchEntity,
  indexSearchEntity,
  waitUntilOf,
} from "../../lib/side-effects";

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

// GET / — list timeline events (paginated).
app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const q = c.req.query();
    const page = Number(q.page) || 1;
    const pageSize = Number(q.pageSize) || 50;
    const conditions: any[] = [];
    if (q.sourceType) conditions.push(eq(timelineEvents.sourceType, q.sourceType));
    if (q.sourceId) conditions.push(eq(timelineEvents.sourceId, q.sourceId));
    if (q.eventType) conditions.push(eq(timelineEvents.eventType, q.eventType));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [countResult] = await db
      .select({ count: count() })
      .from(timelineEvents)
      .where(where);
    const total = Number(countResult?.count ?? 0);
    const items = await db
      .select()
      .from(timelineEvents)
      .where(where)
      .orderBy(desc(timelineEvents.eventDate), asc(timelineEvents.sortOrder))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const totalPages = Math.ceil(total / pageSize);
    return c.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST / — create a timeline event.
app.post("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (typeof body?.title !== "string" || body.title.trim() === "") {
      return c.json({ error: "title is required" }, 400);
    }
    if (typeof body?.eventDate !== "string" || body.eventDate.trim() === "") {
      return c.json({ error: "eventDate is required" }, 400);
    }
    const db = getApiDb();
    const [row] = await db
      .insert(timelineEvents)
      .values({
        sourceType:
          typeof body.sourceType === "string" ? body.sourceType : undefined,
        sourceId:
          typeof body.sourceId === "string" ? body.sourceId : undefined,
        eventType:
          typeof body.eventType === "string" ? body.eventType : undefined,
        title: body.title,
        description:
          typeof body.description === "string" ? body.description : undefined,
        eventDate: body.eventDate,
        icon: typeof body.icon === "string" ? body.icon : undefined,
        url: typeof body.url === "string" ? body.url : undefined,
        sortOrder:
          typeof body.sortOrder === "number" ? body.sortOrder : undefined,
      })
      .returning();
    if (!row) return c.json({ error: "Failed to create timeline event" }, 500);
    void indexSearchEntity(db, "timeline_event", row.id, c.env, waitUntilOf(c));
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// PUT /:id — update a timeline event.
app.put("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const db = getApiDb();
    const patch: Record<string, unknown> = {};
    for (const key of [
      "sourceType",
      "sourceId",
      "eventType",
      "title",
      "description",
      "eventDate",
      "icon",
      "url",
      "sortOrder",
    ]) {
      if (body?.[key] !== undefined) patch[key] = body[key];
    }
    const [row] = await db
      .update(timelineEvents)
      .set(patch)
      .where(eq(timelineEvents.id, c.req.param("id")))
      .returning();
    if (!row) return c.json({ error: "Timeline event not found" }, 404);
    void indexSearchEntity(db, "timeline_event", row.id, c.env, waitUntilOf(c));
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// DELETE /:id — delete a timeline event.
app.delete("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const id = c.req.param("id");
    await db.delete(timelineEvents).where(eq(timelineEvents.id, id));
    void deleteSearchEntity(db, "timeline_event", id, waitUntilOf(c));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
