// Admin releases CRUD — Hono port of the Next.js admin REST routes
// apps/admin/src/app/api/releases/route.ts and
// apps/admin/src/app/api/releases/[id]/route.ts, plus the sub-resources
// apps/admin/src/app/api/releases/[id]/{lyrics,platforms,videos,timeline}/route.ts.
// Mounted at /api/admin/releases by routes/admin/index.ts.
//
// Fidelity notes:
// - Response shapes match the Next.js routes exactly: list returns
//   { releases, total, page, pageSize, totalPages }; get/create/update
//   return the bare row; delete returns { success: true }. The sources
//   ran raw SQL (snake_case rows) through toCamel; direct Drizzle rows are
//   already keyed by the schema's camelCase property names, so no case
//   conversion is applied (toCamel is shallow, and nested jsonb values —
//   release `credits`, lyrics `translations` — keep their keys untouched
//   either way).
// - Create/update take the dashboard form body verbatim, exactly as the
//   @repo/artist ReleaseRepository did: camelCase keys are mapped to table
//   columns, `format` is aliased to `releaseFormat` (the column is
//   `release_format`), empty-string releaseDate becomes NULL, `id` /
//   `createdAt` / `updatedAt` are never taken from the body, and unknown
//   keys are dropped (the source would have failed the SQL on an unknown
//   column instead — the admin UI only ever sends known fields).
// - Create skips null values (so DB defaults apply, e.g. status "draft");
//   update sets nulls, as in the repository. A body with no updatable
//   fields returns the existing row, as in the repository.
// - Delete removes the child rows first (release_platforms,
//   release_videos, release_lyrics, timeline_events with
//   source_type='release'), because no FKs point from them to releases.
// - Timeline IS implemented: it is plain table CRUD on timeline_events
//   (list / add / delete by eventId in the body), same as the source.
//
// TODO(cutover): the sources also (a) indexed / de-indexed the entity via
// SearchIndexerService, (b) dispatched the "release_published" workflow
// trigger on create, and (c) purged the public site cache via
// purgePublicCache(["releases", "home"]). Those cross-cutting side effects
// are NOT ported here — the cutover wires them centrally. The TODO markers
// below show where each call belongs.
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
  releaseLyrics,
  releasePlatforms,
  releaseType,
  releaseVideos,
  releases,
  timelineEvents,
} from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth, unauthorized } from "../../lib/admin-auth";

const app = new Hono();

// Columns of the releases table, keyed by their camelCase property name —
// used as the allowlist for create/update bodies.
const RELEASE_COLUMNS = getTableColumns(releases);

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
    const { page, pageSize } = parsePage((name) => c.req.query(name));
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
    const body = (await c.req.json()) as Record<string, unknown>;
    const db = getApiDb();
    const [row] = await db
      .insert(releases)
      .values({
        ...releaseFields(body, true),
        createdBy: user.id,
      } as typeof releases.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create release" }, 500);
    // TODO(cutover): searchIndexer.indexEntity("release", row.id);
    // TODO(cutover): dispatchTrigger(dbUrl, "release_published", row.id, { ...row, triggeredBy: user.id });
    // TODO(cutover): purgePublicCache(["releases", "home"]).
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to create release") }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
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
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const db = getApiDb();
    const values = releaseFields(body, false);
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
    // TODO(cutover): searchIndexer.indexEntity("release", row.id);
    // TODO(cutover): purgePublicCache(["releases", "home"]).
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to update release") }, 500);
  }
});

app.delete("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
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
    // TODO(cutover): searchIndexer.deleteEntity("release", id);
    // TODO(cutover): purgePublicCache(["releases", "home"]).
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to delete release") }, 500);
  }
});

// ─── Lyrics (one row per release) ────────────────────────────────────────────

app.get("/:id/lyrics", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
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
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
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
      const sets: Partial<typeof releaseLyrics.$inferInsert> = {};
      if (body.lyricsText !== undefined) {
        sets.lyricsText = body.lyricsText as string | null;
      }
      if (body.lyricsLanguage !== undefined) {
        sets.lyricsLanguage = body.lyricsLanguage as string | null;
      }
      if (body.translations !== undefined) {
        sets.translations = body.translations as Record<string, unknown> | null;
      }
      if (body.status !== undefined) {
        sets.status = body.status as string | null;
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

    const [row] = await db
      .insert(releaseLyrics)
      .values({
        releaseId: id,
        lyricsText: (body.lyricsText as string | undefined) ?? null,
        lyricsLanguage: (body.lyricsLanguage as string | undefined) ?? null,
        translations:
          (body.translations as Record<string, unknown> | undefined) ?? null,
        status: (body.status as string | undefined) ?? "draft",
      })
      .returning();
    if (!row) return c.json({ error: "Failed to save lyrics" }, 500);
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to save lyrics") }, 500);
  }
});

// ─── Release platforms (streaming / store links) ────────────────────────────

app.get("/:id/platforms", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
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
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    // The dashboard form sends `url`; the repository column is platform_url.
    const platformUrl =
      (body.platformUrl as string | undefined) ??
      (body.url as string | undefined) ??
      null;
    const db = getApiDb();
    const [row] = await db
      .insert(releasePlatforms)
      .values({
        releaseId: id,
        platformName: (body.platformName as string | undefined) ?? null,
        platformUrl,
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
    const platformId = c.req.param("platformId");
    const body = (await c.req.json()) as Record<string, unknown>;
    // Accept the dashboard form's `url` as an alias for `platformUrl`.
    if (body.url !== undefined && body.platformUrl === undefined) {
      body.platformUrl = body.url;
    }
    delete body.url;
    const sets: Partial<typeof releasePlatforms.$inferInsert> = {};
    if (body.platformName !== undefined) {
      sets.platformName = body.platformName as string | null;
    }
    if (body.platformUrl !== undefined) {
      sets.platformUrl = body.platformUrl as string | null;
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
    const platformId = c.req.param("platformId");
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

// ─── Release videos ──────────────────────────────────────────────────────────

app.get("/:id/videos", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
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
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    // The dashboard form sends `url`; the repository expects `videoUrl`.
    if (body.url !== undefined && body.videoUrl === undefined) {
      body.videoUrl = body.url;
    }
    delete body.url;
    const db = getApiDb();
    const [row] = await db
      .insert(releaseVideos)
      .values({
        releaseId: id,
        platformName: (body.platformName as string | undefined) ?? null,
        videoUrl: (body.videoUrl as string | undefined) ?? null,
        title: (body.title as string | undefined) ?? null,
        sortOrder: (body.sortOrder as number | undefined) ?? null,
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
    // The source deletes by ?videoId= on the collection route.
    const videoId = c.req.query("videoId");
    if (!videoId) {
      return c.json({ error: "videoId query param required" }, 400);
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

// ─── Release timeline ────────────────────────────────────────────────────────

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
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const db = getApiDb();
    const [row] = await db
      .insert(timelineEvents)
      .values({
        sourceType: "release",
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
