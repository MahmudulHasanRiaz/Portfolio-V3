// Release lyrics (one row per release) — split from releases.ts.
// Routes: GET /:id/lyrics, PUT /:id/lyrics.
import { Hono } from "hono";
import { z } from "zod";
import {
  createReleaseLyricSchema,
  updateReleaseLyricSchema,
} from "@repo/validation";
import { eq } from "drizzle-orm";
import { releaseLyrics } from "@repo/database/schema";
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

// ─── Validation ──────────────────────────────────────────────────────────────
// Release sub-resource schemas from @repo/validation. Adaptations (the
// shared schemas describe the table row, the route body differs):
// - Lyrics: `releaseId` is server-set from :id, never in the body, so it
//   is omitted; `status` is a plain varchar(20) in the DB with no known
//   enum, so it stays a plain string (no enum invented).
const createLyricBodySchema = createReleaseLyricSchema
  .omit({ releaseId: true })
  .extend({ status: z.string().optional() });
const updateLyricBodySchema = updateReleaseLyricSchema
  .omit({ releaseId: true })
  .extend({ status: z.string().optional() });

// ─── Lyrics (one row per release) ────────────────────────────────────────────

app.get("/:id/lyrics", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(releaseLyrics)
      .where(eq(releaseLyrics.releaseId, id))
      .limit(1);
    // The source returns {} when no lyrics row exists yet.
    return c.json(row ?? {});
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch lyrics") }, 500);
  }
});

app.put("/:id/lyrics", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    // The dashboard form sends `language`; the repository expects
    // `lyricsLanguage`.
    if (body.language !== undefined && body.lyricsLanguage === undefined) {
      body.lyricsLanguage = body.language;
    }
    delete body.language;

    const db = getApiDb();
    const [existing] = await db
      .select()
      .from(releaseLyrics)
      .where(eq(releaseLyrics.releaseId, id))
      .limit(1);

    if (existing) {
      const v = validateBody(body, updateLyricBodySchema);
      if ("error" in v) return c.json({ error: v.error }, 400);
      const data = { ...(v.data as Record<string, unknown>) };
      stripServerManaged(data);
      const sets: Partial<typeof releaseLyrics.$inferInsert> = {};
      if (data.lyricsText !== undefined) {
        sets.lyricsText = data.lyricsText as string | null;
      }
      if (data.lyricsLanguage !== undefined) {
        sets.lyricsLanguage = data.lyricsLanguage as string | null;
      }
      if (data.translations !== undefined) {
        sets.translations = data.translations as Record<string, unknown> | null;
      }
      if (data.status !== undefined) {
        sets.status = data.status as string | null;
      }
      if (Object.keys(sets).length === 0) return c.json(existing);
      const [row] = await db
        .update(releaseLyrics)
        .set(sets)
        .where(eq(releaseLyrics.id, existing.id))
        .returning();
      if (!row) return c.json({ error: "Failed to save lyrics" }, 500);
      return c.json(row);
    }

    const v = validateBody(body, createLyricBodySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const [row] = await db
      .insert(releaseLyrics)
      .values({
        releaseId: id,
        lyricsText: (data.lyricsText as string | undefined) ?? null,
        lyricsLanguage: (data.lyricsLanguage as string | undefined) ?? null,
        translations:
          (data.translations as Record<string, unknown> | undefined) ?? null,
        status: (data.status as string | undefined) ?? "draft",
      })
      .returning();
    if (!row) return c.json({ error: "Failed to save lyrics" }, 500);
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to save lyrics") }, 500);
  }
});

export default app;
