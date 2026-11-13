// Release videos — split from releases.ts.
// Routes: GET /:id/videos, POST /:id/videos, DELETE /:id/videos.
import { Hono } from "hono";
import {
  createReleaseVideoSchema,
  uuidSchema,
} from "@repo/validation";
import { asc, desc, eq } from "drizzle-orm";
import { releaseVideos } from "@repo/database/schema";
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

// ─── Release videos ──────────────────────────────────────────────────────────

app.get("/:id/videos", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const rows = await db
      .select()
      .from(releaseVideos)
      .where(eq(releaseVideos.releaseId, id))
      // ORDER BY sort_order ASC NULLS LAST, created_at DESC — ASC is
      // already NULLS LAST in Postgres, so plain asc() matches.
      .orderBy(asc(releaseVideos.sortOrder), desc(releaseVideos.createdAt));
    return c.json(rows);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch videos") }, 500);
  }
});

app.post("/:id/videos", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    // The dashboard form sends `url`; the repository expects `videoUrl`.
    if (body.url !== undefined && body.videoUrl === undefined) {
      body.videoUrl = body.url;
    }
    delete body.url;
    const v = validateBody(body, createReleaseVideoSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    const [row] = await db
      .insert(releaseVideos)
      .values({
        releaseId: id,
        platformName: data.platformName ?? null,
        videoUrl: data.videoUrl ?? null,
        title: data.title ?? null,
        sortOrder: data.sortOrder ?? null,
      })
      .returning();
    if (!row) return c.json({ error: "Failed to create video link" }, 500);
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to create video link") }, 500);
  }
});

app.delete("/:id/videos", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    // The source deletes by ?videoId= on the collection route.
    const videoId = c.req.query("videoId");
    if (!videoId) {
      return c.json({ error: "videoId query param required" }, 400);
    }
    if (!uuidSchema.safeParse(videoId).success) {
      return invalidParam(c, "videoId");
    }
    const db = getApiDb();
    const [deleted] = await db
      .delete(releaseVideos)
      .where(eq(releaseVideos.id, videoId))
      .returning({ id: releaseVideos.id });
    if (!deleted) return c.json({ error: "Video not found" }, 404);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to delete video link") }, 500);
  }
});

export default app;
