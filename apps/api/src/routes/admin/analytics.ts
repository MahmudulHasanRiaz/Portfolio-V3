// Admin analytics — Hono port of apps/admin/src/app/api/analytics/*/route.ts
// (pages, referrers, search, summary, track, utm).
//
// Mounted at /api/admin/analytics (see routes/admin/index.ts).
//
// Workers-safety verdict: @repo/analytics is NOT Workers-safe — every
// service in it calls getDb() from @repo/database, which is a postgres.js
// (TCP) singleton, and the aggregator even holds a module-level
// `const db = getDb()`. The aggregations and the track beacon are therefore
// re-implemented here with direct Drizzle over getApiDb() (Neon HTTP).
// The SQL is copied verbatim from packages/analytics/src — same queries,
// same response shapes — only the driver changes. extractUTMParams is
// pure (no DB) and is copied verbatim from packages/analytics/src/utm-service.ts.
//
// Fidelity notes:
// - The five read routes require a session (requireAuth → 401) and keep
//   the originals' fixed error strings ("Failed to fetch pages." etc.),
//   which are part of the response contract.
// - POST /track is a PUBLIC beacon by design (no auth), exactly as in
//   the original. It also preserves the original's lookup quirk:
//   getActiveSession(visitorId) ignores the client-supplied sessionId
//   and returns any active session for the visitor; a new session is
//   started only when no active session exists.
// - Neon HTTP does not support db.transaction(): the beacon's
//   identify → session → page-view steps run as sequential statements,
//   as in the original (which also used no transaction).
//
// TODO (cutover): /track has no rate limiting today (the inventory flags
// it CHECK — public write, needs a rate-limit/abuse decision). A shared
// limiter (KV/DO) must be decided at cutover; do not ship the public
// beacon to production unprotected.
import { Hono } from "hono";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  pageViews,
  searchAnalytics,
  visitors,
  visitorSessions,
} from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import {
  isRecord,
  readJsonBody,
  validateBody,
} from "../../lib/validate";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

type Db = ReturnType<typeof getApiDb>;

const app = new Hono<Env>();

function daysAgo(days: number): Date {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return since;
}

/** Clamp an int query param to [min, max], falling back to `def` when
 *  absent or non-numeric (parsePagination-style clamping, for the
 *  limit/days params — never throws, never NaN). */
function clampQueryInt(
  raw: string | undefined,
  def: number,
  min: number,
  max: number,
): number {
  const n = parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

// POST /track body validation (local schema — no shared analytics
// schema exists). sessionId is a visitor_sessions uuid; the route
// still ignores its value for the lookup (see the preserved quirk in
// the handler) but it must be a well-formed uuid when supplied.
const trackEventSchema = z.object({
  anonymousId: z.string().min(1).max(255),
  path: z.string().min(1).max(2048),
  title: z.string().max(500).optional(),
  referrer: z.string().max(2048).optional(),
  userAgent: z.string().max(500).optional(),
  sessionId: z.string().uuid().optional(),
});

// ─── AnalyticsAggregator, re-implemented on the Neon HTTP db ────────────────
// (packages/analytics/src/analytics-aggregator.ts, queries verbatim.)

async function getTrafficSummary(db: Db, since?: Date) {
  const pageViewConditions = since ? [gte(pageViews.timestamp, since)] : [];
  const sessionConditions = since
    ? [gte(visitorSessions.startTime, since)]
    : [];

  const [pageViewResult, visitorResult, sessionResult, durationResult, bounceResult] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(pageViews)
        .where(and(...pageViewConditions)),
      db
        .select({ count: count() })
        .from(visitors)
        .where(since ? gte(visitors.lastVisit, since) : sql`1=1`),
      // Real session count: rows in visitor_sessions started in range.
      db
        .select({ count: count() })
        .from(visitorSessions)
        .where(and(...sessionConditions)),
      // Average session duration (seconds) over sessions that ended.
      db
        .select({
          avg: sql<number | null>`AVG(EXTRACT(EPOCH FROM (${visitorSessions.endTime} - ${visitorSessions.startTime})))`,
        })
        .from(visitorSessions)
        .where(
          and(
            ...sessionConditions,
            sql`${visitorSessions.endTime} IS NOT NULL`,
          ),
        ),
      // Bounce = sessions with at most one tracked page view.
      db
        .select({ count: count() })
        .from(visitorSessions)
        .where(
          and(
            ...sessionConditions,
            sql`(SELECT COUNT(*) FROM ${pageViews} WHERE ${pageViews.sessionId} = ${visitorSessions.id}) <= 1`,
          ),
        ),
    ]);

  const totalSessions = sessionResult[0]?.count ?? 0;
  const bounced = bounceResult[0]?.count ?? 0;
  const avgDuration = Number(durationResult[0]?.avg ?? 0);

  return {
    totalVisitors: visitorResult[0]?.count ?? 0,
    totalPageViews: pageViewResult[0]?.count ?? 0,
    totalSessions,
    averageSessionDuration: Number.isFinite(avgDuration)
      ? Math.round(avgDuration)
      : 0,
    bounceRate:
      totalSessions > 0 ? Math.round((bounced / totalSessions) * 1000) / 10 : 0,
  };
}

async function getTopPages(db: Db, limit = 20, since?: Date) {
  const conditions = since ? [gte(pageViews.timestamp, since)] : [];
  return db
    .select({ path: pageViews.path, views: count() })
    .from(pageViews)
    .where(and(...conditions))
    .groupBy(pageViews.path)
    .orderBy(desc(count()))
    .limit(limit);
}

async function getTopReferrers(db: Db, limit = 20, since?: Date) {
  const conditions: ReturnType<typeof gte>[] = [
    sql`${pageViews.referrer} IS NOT NULL`,
    sql`${pageViews.referrer} != ''`,
  ];
  if (since) conditions.push(gte(pageViews.timestamp, since));

  const rows = await db
    .select({ referrer: pageViews.referrer, count: count() })
    .from(pageViews)
    .where(and(...conditions))
    .groupBy(pageViews.referrer)
    .orderBy(desc(count()))
    .limit(limit);

  return rows.map((r) => ({
    referrer: r.referrer ?? "direct",
    count: r.count,
  }));
}

async function getUTMPerformance(db: Db, limit = 20, since?: Date) {
  const conditions: ReturnType<typeof gte>[] = [
    sql`${pageViews.utmSource} IS NOT NULL`,
  ];
  if (since) conditions.push(gte(pageViews.timestamp, since));

  const rows = await db
    .select({
      utmSource: pageViews.utmSource,
      utmMedium: pageViews.utmMedium,
      utmCampaign: pageViews.utmCampaign,
      visits: count(),
      leads: sql<number>`COUNT(DISTINCT CASE WHEN ${pageViews.leadId} IS NOT NULL THEN ${pageViews.leadId} END)`,
    })
    .from(pageViews)
    .where(and(...conditions))
    .groupBy(pageViews.utmSource, pageViews.utmMedium, pageViews.utmCampaign)
    .orderBy(desc(count()))
    .limit(limit);

  return rows.map((r) => ({
    utmSource: r.utmSource ?? "unknown",
    utmMedium: r.utmMedium ?? "unknown",
    utmCampaign: r.utmCampaign ?? "unknown",
    visits: r.visits,
    leads: r.leads ?? 0,
  }));
}

async function getTopSearchQueries(db: Db, limit = 20, since?: Date) {
  const conditions = since ? [gte(searchAnalytics.createdAt, since)] : [];

  const rows = await db
    .select({ query: searchAnalytics.query, count: count() })
    .from(searchAnalytics)
    .where(and(...conditions))
    .groupBy(searchAnalytics.query)
    .orderBy(desc(count()))
    .limit(limit);

  return rows.map((r) => ({
    query: r.query ?? "",
    count: r.count,
  }));
}

// ─── Track beacon services, re-implemented on the Neon HTTP db ──────────────
// (packages/analytics/src/visitor-service.ts, session-service.ts,
// page-view-service.ts — logic verbatim; utm-service.ts extractUTMParams
// is pure and copied verbatim below.)

interface UTMParams {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
}

function extractUTMParams(url: string | URL | URLSearchParams): UTMParams {
  const params =
    url instanceof URLSearchParams
      ? url
      : new URL(url instanceof URL ? url : url, "http://localhost").searchParams;

  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmContent = params.get("utm_content");
  const utmTerm = params.get("utm_term");

  return {
    utmSource: utmSource || null,
    utmMedium: utmMedium || null,
    utmCampaign: utmCampaign || null,
    utmContent: utmContent || null,
    utmTerm: utmTerm || null,
  };
}

async function identifyVisitor(
  db: Db,
  data: {
    anonymousId: string;
    userAgent?: string | null;
    referrer?: string | null;
  },
) {
  const existing = await db
    .select()
    .from(visitors)
    .where(eq(visitors.anonymousId, data.anonymousId))
    .limit(1);

  if (existing.length > 0) {
    const visitor = existing[0]!;
    const [updated] = await db
      .update(visitors)
      .set({
        lastVisit: new Date(),
        visitCount: sql`${visitors.visitCount} + 1`,
        userAgent: data.userAgent ?? visitor.userAgent,
        referrer: data.referrer ?? visitor.referrer,
      })
      .where(eq(visitors.id, visitor.id))
      .returning();
    return updated!;
  }

  const [created] = await db
    .insert(visitors)
    .values({
      anonymousId: data.anonymousId,
      userAgent: data.userAgent,
      referrer: data.referrer,
      visitCount: 1,
    })
    .returning();
  return created!;
}

async function getActiveSession(db: Db, visitorId: string) {
  const [session] = await db
    .select()
    .from(visitorSessions)
    .where(
      and(
        eq(visitorSessions.visitorId, visitorId),
        eq(visitorSessions.isActive, true),
      ),
    )
    .limit(1);
  return session || null;
}

async function startSession(
  db: Db,
  data: {
    visitorId: string;
    landingPage?: string | null;
    referrer?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    utmTerm?: string | null;
  },
) {
  await db
    .update(visitorSessions)
    .set({ isActive: false, endTime: new Date() })
    .where(
      and(
        eq(visitorSessions.visitorId, data.visitorId),
        eq(visitorSessions.isActive, true),
      ),
    );

  const [session] = await db
    .insert(visitorSessions)
    .values({
      visitorId: data.visitorId,
      landingPage: data.landingPage,
      referrer: data.referrer,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      utmContent: data.utmContent,
      utmTerm: data.utmTerm,
      isActive: true,
    })
    .returning();
  return session!;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /pages — { pages: [{ path, views }] }
app.get("/pages", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const limit = clampQueryInt(c.req.query("limit"), 20, 1, 100);
    const days = clampQueryInt(c.req.query("days"), 30, 1, 365);
    const pages = await getTopPages(getApiDb(), limit, daysAgo(days));
    return c.json({ pages });
  } catch (err) {
    console.error("[Analytics Pages] Error:", err);
    return c.json({ error: "Failed to fetch pages." }, 500);
  }
});

// GET /referrers — { referrers: [{ referrer, count }] }
app.get("/referrers", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const limit = clampQueryInt(c.req.query("limit"), 20, 1, 100);
    const days = clampQueryInt(c.req.query("days"), 30, 1, 365);
    const referrers = await getTopReferrers(getApiDb(), limit, daysAgo(days));
    return c.json({ referrers });
  } catch (err) {
    console.error("[Analytics Referrers] Error:", err);
    return c.json({ error: "Failed to fetch referrers." }, 500);
  }
});

// GET /search — { queries: [{ query, count }] } (search-query analytics,
// NOT the main search endpoint — that lives in routes/admin/search.ts)
app.get("/search", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const limit = clampQueryInt(c.req.query("limit"), 20, 1, 100);
    const days = clampQueryInt(c.req.query("days"), 30, 1, 365);
    const queries = await getTopSearchQueries(getApiDb(), limit, daysAgo(days));
    return c.json({ queries });
  } catch (err) {
    console.error("[Analytics Search] Error:", err);
    return c.json({ error: "Failed to fetch search analytics." }, 500);
  }
});

// GET /summary — the TrafficSummary object itself (no wrapper)
app.get("/summary", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const days = clampQueryInt(c.req.query("days"), 30, 1, 365);
    const summary = await getTrafficSummary(getApiDb(), daysAgo(days));
    return c.json(summary);
  } catch (err) {
    console.error("[Analytics Summary] Error:", err);
    return c.json({ error: "Failed to fetch summary." }, 500);
  }
});

// POST /track — PUBLIC beacon by design (no auth). Body:
// { anonymousId, path, title?, referrer?, userAgent?, sessionId? }
// Returns { visitorId, sessionId }.
//
// TODO (cutover): no rate limit exists on this endpoint today — the
// public-write abuse decision (shared limiter) is a cutover item, not
// something this port invents. See the file header.
app.post("/track", async (c) => {
  try {
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const v = validateBody(body, trackEventSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const { anonymousId, path, title, referrer, userAgent, sessionId } =
      v.data;

    const db = getApiDb();
    const utmParams =
      typeof referrer === "string" && referrer
        ? extractUTMParams(referrer)
        : {};

    const visitor = await identifyVisitor(db, {
      anonymousId,
      userAgent: userAgent || null,
      referrer: referrer || null,
    });

    let currentSessionId = sessionId;
    // NOTE (preserved quirk): the original looks up ANY active session
    // for the visitor and ignores the supplied sessionId value.
    const activeSession = currentSessionId
      ? await getActiveSession(db, visitor.id)
      : null;

    if (!activeSession) {
      const newSession = await startSession(db, {
        visitorId: visitor.id,
        landingPage: path,
        referrer: referrer || null,
        ...utmParams,
      });
      currentSessionId = newSession.id;
    }

    await db.insert(pageViews).values({
      visitorId: visitor.id,
      sessionId: currentSessionId,
      path,
      title: title || null,
      referrer: referrer || null,
      ...utmParams,
    });

    return c.json({
      visitorId: visitor.id,
      sessionId: currentSessionId,
    });
  } catch (err) {
    console.error("[Analytics Track] Error:", err);
    return c.json({ error: "Tracking failed." }, 500);
  }
});

// GET /utm — { utmData: [{ utmSource, utmMedium, utmCampaign, visits, leads }] }
app.get("/utm", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const limit = clampQueryInt(c.req.query("limit"), 20, 1, 100);
    const days = clampQueryInt(c.req.query("days"), 30, 1, 365);
    const utmData = await getUTMPerformance(getApiDb(), limit, daysAgo(days));
    return c.json({ utmData });
  } catch (err) {
    console.error("[Analytics UTM] Error:", err);
    return c.json({ error: "Failed to fetch UTM data." }, 500);
  }
});

export default app;
