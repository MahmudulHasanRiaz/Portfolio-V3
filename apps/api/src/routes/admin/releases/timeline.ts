// Release timeline — split from releases.ts.
// Routes: GET /:id/timeline, POST /:id/timeline, DELETE /:id/timeline.
import { Hono } from "hono";
import { z } from "zod";
import {
  createTimelineEventSchema,
  uuidSchema,
} from "@repo/validation";
import { and, desc, eq, sql } from "drizzle-orm";
import { timelineEvents } from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth, unauthorized } from "../../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import { errorMessage } from "./helpers";

const app = new Hono();

// ─── Validation ──────────────────────────────────────────────────────────────
// - Timeline: `sourceType`/`sourceId` are server-set ("release" / :id).
const timelineBodySchema = createTimelineEventSchema.omit({
  sourceType: true,
  sourceId: true,
});
const deleteTimelineSchema = z.object({ eventId: uuidSchema });

// ─── Release timeline ────────────────────────────────────────────────────────

app.get("/:id/timeline", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const rows = await db
      .select()
      .from(timelineEvents)
      .where(
        and(
          eq(timelineEvents.sourceType, "release"),
          eq(timelineEvents.sourceId, id),
        ),
      )
      // ORDER BY event_date DESC NULLS LAST, created_at DESC — the NULLS
      // LAST needs explicit SQL: plain desc() is NULLS FIRST in Postgres.
      .orderBy(
        sql`${timelineEvents.eventDate} DESC NULLS LAST`,
        desc(timelineEvents.createdAt),
      );
    return c.json(rows);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch timeline") }, 500);
  }
});

app.post("/:id/timeline", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, timelineBodySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    const [row] = await db
      .insert(timelineEvents)
      .values({
        sourceType: "release",
        sourceId: id,
        eventType: data.eventType,
        title: data.title,
        description: data.description ?? null,
        eventDate: data.eventDate,
        icon: data.icon ?? null,
        url: data.url ?? null,
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    // A bodyless DELETE is a 400 here (not a 500 from bare .json()).
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, deleteTimelineSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const eventId = v.data.eventId;
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
