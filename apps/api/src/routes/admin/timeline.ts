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
  createTimelineEventSchema,
  updateTimelineEventSchema,
  uuidSchema,
} from "@repo/validation";
import {
  invalidParam,
  isRecord,
  parsePagination,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../lib/validate";
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
    const { page, pageSize } = parsePagination(c, { defaultPageSize: 50 });
    const sourceType = c.req.query("sourceType");
    if (sourceType !== undefined && sourceType.length > 50) {
      return c.json({ error: "sourceType must be at most 50 characters" }, 400);
    }
    const sourceId = c.req.query("sourceId");
    if (sourceId !== undefined && !uuidSchema.safeParse(sourceId).success) {
      return c.json({ error: "sourceId must be a UUID" }, 400);
    }
    const eventType = c.req.query("eventType");
    if (eventType !== undefined && eventType.length > 50) {
      return c.json({ error: "eventType must be at most 50 characters" }, 400);
    }
    const conditions: any[] = [];
    if (sourceType) conditions.push(eq(timelineEvents.sourceType, sourceType));
    if (sourceId) conditions.push(eq(timelineEvents.sourceId, sourceId));
    if (eventType) conditions.push(eq(timelineEvents.eventType, eventType));
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    // Reuse the shared create schema — but .partial(): the schema
    // requires sourceType / sourceId / eventType, while the admin UI
    // create form (dashboard/content/timeline) never sends sourceType
    // or sourceId, and the DB columns are all nullable, so the
    // verbatim schema would 400 every UI create. Title / eventDate
    // stay required via the non-empty checks below.
    const v = validateBody(body, createTimelineEventSchema.partial());
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    // The shared schema leaves title / eventDate as bare strings; the
    // original required them non-empty, so those checks stay.
    if (typeof data.title !== "string" || data.title.trim() === "") {
      return c.json({ error: "title is required" }, 400);
    }
    if (typeof data.eventDate !== "string" || data.eventDate.trim() === "") {
      return c.json({ error: "eventDate is required" }, 400);
    }
    const db = getApiDb();
    const [row] = await db
      .insert(timelineEvents)
      .values({
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        eventType: data.eventType,
        title: data.title,
        description: data.description,
        eventDate: data.eventDate,
        icon: data.icon,
        url: data.url,
        sortOrder: data.sortOrder,
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateTimelineEventSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    // Same 9-field allowlist the raw key-loop copied; the partial
    // schema's server-managed `id` / `createdAt` are never passed
    // through, so a client cannot overwrite them.
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
    ] as const) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    const [row] = await db
      .update(timelineEvents)
      .set(patch)
      .where(eq(timelineEvents.id, id))
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    await db.delete(timelineEvents).where(eq(timelineEvents.id, id));
    void deleteSearchEntity(db, "timeline_event", id, waitUntilOf(c));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
