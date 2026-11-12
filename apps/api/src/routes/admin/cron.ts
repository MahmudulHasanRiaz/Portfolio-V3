// Internal cron routes — Hono port of
// apps/admin/src/app/api/cron/publish/route.ts (GET) and
// apps/admin/src/app/api/cron/workflows/route.ts (GET).
//
// Mounted at /api/admin/cron (see routes/admin/index.ts).
//
// Auth: x-cron-secret header vs CRON_SECRET, fail-closed — 500 when
// the secret is not configured, 401 on mismatch. Preserved exactly
// from the sources (both cron routes are GET in the original, not
// POST; no session auth is used).
//
// TODO (cutover): the Workers Cron Trigger is NOT wired — nothing
// invokes these routes on a schedule yet. Cutover must add the
// trigger (wrangler.toml [[triggers]] / scheduled handler) and set
// CRON_SECRET in the Worker env; until then these routes only run
// when called manually with the header.
//
// SchedulingService.processScheduledContent (packages/cms/src/scheduling.ts)
// is re-implemented here with direct Drizzle over getApiDb() (Neon
// HTTP) — the CMS service calls getDb() (postgres.js, TCP) and is not
// Workers-safe. The status updates are the same (scheduled → published
// for due publishAt, published → draft for due unpublishAt), but the
// ContentService.transition() side effects (search-index update and
// purgePublicCache) are NOT wired — see the TODO (cutover) below.
import { Hono } from "hono";
import type { Context } from "hono";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { posts } from "@repo/database/schema";
import { getApiDb } from "../../db";
import { processNextRun } from "./workflows";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

const app = new Hono<Env>();

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

const MAX_RUNS_PER_TICK = 25;

/**
 * Fail-closed cron-secret gate, exactly as in the Next.js sources.
 * Returns a Response to send immediately, or null when authorised.
 * NOTE: reads process.env.CRON_SECRET, following the house pattern
 * in this API (db.ts / admin-auth.ts also read process.env); cutover
 * must ensure CRON_SECRET is set in the Worker env.
 */
function checkCronSecret(c: Context): Response | null {
  const configured = process.env.CRON_SECRET;
  if (!configured) {
    return new Response(
      JSON.stringify({ error: "CRON_SECRET is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  if (c.req.header("x-cron-secret") !== configured) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

// GET /publish — publish due scheduled posts, unpublish due ones.
// Returns { success: true, published, unpublished }.
app.get("/publish", async (c) => {
  const gate = checkCronSecret(c);
  if (gate) return gate;

  try {
    const db = getApiDb();
    const now = new Date();

    const toPublish = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          isNotNull(posts.publishAt),
          lte(posts.publishAt, now),
          eq(posts.status, "scheduled"),
        ),
      );

    const toUnpublish = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          isNotNull(posts.unpublishAt),
          lte(posts.unpublishAt, now),
          eq(posts.status, "published"),
        ),
      );

    // TODO (cutover): the original routes each post through
    // ContentService.transition(), which also fires the search-index
    // update (index on publish / de-index on unpublish) and
    // purgePublicCache. Those side effects are NOT wired here yet.
    // The status flips below are the same transitions (scheduled →
    // published and published → draft are both valid per the posts
    // workflow), run as sequential statements — Neon HTTP has no
    // transaction support.
    for (const post of toPublish) {
      await db
        .update(posts)
        .set({ status: "published", updatedAt: new Date() })
        .where(eq(posts.id, post.id));
    }

    for (const post of toUnpublish) {
      await db
        .update(posts)
        .set({ status: "draft", updatedAt: new Date() })
        .where(eq(posts.id, post.id));
    }

    return c.json({
      success: true,
      published: toPublish.length,
      unpublished: toUnpublish.length,
    });
  } catch {
    return c.json({ error: "Failed to process scheduled content" }, 500);
  }
});

// GET /workflows — execute up to 25 pending workflow runs, one per
// processNext tick. Returns { success: true, processed, runs }.
//
// TODO (cutover): each tick executes a run synchronously in-request
// (see the TODO on workflows /process) — 25 sequential runs can
// exceed Workers max duration. Cutover must decide the per-tick
// budget (or move execution to a queue) when wiring the trigger.
app.get("/workflows", async (c) => {
  const gate = checkCronSecret(c);
  if (gate) return gate;

  try {
    const db = getApiDb();
    const runs: { runId?: string; status?: string }[] = [];
    for (let i = 0; i < MAX_RUNS_PER_TICK; i++) {
      const result = await processNextRun(db);
      if (!result.processed) break;
      runs.push({ runId: result.runId, status: result.status });
    }
    return c.json({ success: true, processed: runs.length, runs });
  } catch (err) {
    return c.json(
      { error: errorMessage(err) || "Failed to process workflow runs" },
      500,
    );
  }
});

export default app;
