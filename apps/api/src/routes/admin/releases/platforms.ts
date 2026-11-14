// Release platforms (streaming / store links) — split from releases.ts.
// Routes: GET /:id/platforms, POST /:id/platforms,
// PATCH /:id/platforms/:platformId, DELETE /:id/platforms/:platformId.
import { Hono } from "hono";
import {
  createReleasePlatformSchema,
  updateReleasePlatformSchema,
} from "@repo/validation";
import { asc, eq } from "drizzle-orm";
import { releasePlatforms } from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth, unauthorized } from "../../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import { errorMessage, stripServerManaged } from "./helpers";

const app = new Hono();

// ─── Release platforms (streaming / store links) ────────────────────────────

app.get("/:id/platforms", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const rows = await db
      .select()
      .from(releasePlatforms)
      .where(eq(releasePlatforms.releaseId, id))
      .orderBy(asc(releasePlatforms.platformName));
    return c.json(rows);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch platforms") }, 500);
  }
});

app.post("/:id/platforms", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    // The dashboard form sends `url`; the repository column is platform_url.
    if (body.url !== undefined && body.platformUrl === undefined) {
      body.platformUrl = body.url;
    }
    delete body.url;
    // createReleasePlatformSchema requires releaseId — server-set from :id.
    const v = validateBody(
      { ...body, releaseId: id },
      createReleasePlatformSchema,
    );
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    const [row] = await db
      .insert(releasePlatforms)
      .values({
        releaseId: id,
        platformName: data.platformName,
        platformUrl: data.platformUrl ?? null,
      })
      .returning();
    if (!row) return c.json({ error: "Failed to create platform link" }, 500);
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to create platform link") }, 500);
  }
});

app.patch("/:id/platforms/:platformId", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const platformId = uuidParam(c, "platformId");
    if (!platformId) return invalidParam(c, "platformId");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    // Accept the dashboard form's `url` as an alias for `platformUrl`.
    if (body.url !== undefined && body.platformUrl === undefined) {
      body.platformUrl = body.url;
    }
    delete body.url;
    const v = validateBody(body, updateReleasePlatformSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const sets: Partial<typeof releasePlatforms.$inferInsert> = {};
    if (data.platformName !== undefined) {
      sets.platformName = data.platformName as string | null;
    }
    if (data.platformUrl !== undefined) {
      sets.platformUrl = data.platformUrl as string | null;
    }
    // The repository returns null when nothing is set — the route 404s.
    if (Object.keys(sets).length === 0) {
      return c.json({ error: "Platform link not found" }, 404);
    }
    const db = getApiDb();
    const [row] = await db
      .update(releasePlatforms)
      .set(sets)
      .where(eq(releasePlatforms.id, platformId))
      .returning();
    if (!row) return c.json({ error: "Platform link not found" }, 404);
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to update platform link") }, 500);
  }
});

app.delete("/:id/platforms/:platformId", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const platformId = uuidParam(c, "platformId");
    if (!platformId) return invalidParam(c, "platformId");
    const db = getApiDb();
    const [deleted] = await db
      .delete(releasePlatforms)
      .where(eq(releasePlatforms.id, platformId))
      .returning({ id: releasePlatforms.id });
    if (!deleted) return c.json({ error: "Platform link not found" }, 404);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to delete platform link") }, 500);
  }
});

export default app;
