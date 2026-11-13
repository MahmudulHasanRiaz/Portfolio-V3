// Shared helpers for the admin analytics routes — moved verbatim from
// routes/admin/analytics.ts (split into routes/admin/analytics/).
//
// The analytics aggregation logic (AnalyticsAggregator, re-implemented
// on the Neon HTTP db) lives here, together with the shared Env/Db
// types and the query-param helpers used by the read routes.
//
// Workers-safety verdict: @repo/analytics is NOT Workers-safe — every
// service in it calls getDb() from @repo/database, which is a postgres.js
// (TCP) singleton, and the aggregator even holds a module-level
// `const db = getDb()`. The aggregations and the track beacon are therefore
// re-implemented here with direct Drizzle over getApiDb() (Neon HTTP).
// The SQL is copied verbatim from packages/analytics/src — same queries,
// same response shapes — only the driver changes. extractUTMParams is
// pure (no DB) and is copied verbatim from packages/analytics/src/utm-service.ts.
import { and, count, desc, gte, sql } from "drizzle-orm";
import {
  pageViews,
  searchAnalytics,
  visitors,
  visitorSessions,
} from "@repo/database/schema";
import { getApiDb } from "../../../db";

export type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

export type Db = ReturnType<typeof getApiDb>;

export function daysAgo(days: number): Date {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return since;
}

/** Clamp an int query param to [min, max], falling back to `def` when
 *  absent or non-numeric (parsePagination-style clamping, for the
 *  limit/days params — never throws, never NaN). */
export function clampQueryInt(
  raw: string | undefined,
  def: number,
  min: number,
  max: number,
): number {
  const n = parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

// ─── AnalyticsAggregator, re-implemented on the Neon HTTP db ────────────────
// (packages/analytics/src/analytics-aggregator.ts, queries verbatim.)

export async function getTrafficSummary(db: Db, since?: Date) {
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

export async function getTopPages(db: Db, limit = 20, since?: Date) {
  const conditions = since ? [gte(pageViews.timestamp, since)] : [];
  return db
    .select({ path: pageViews.path, views: count() })
    .from(pageViews)
    .where(and(...conditions))
    .groupBy(pageViews.path)
    .orderBy(desc(count()))
    .limit(limit);
}

export async function getTopReferrers(db: Db, limit = 20, since?: Date) {
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

export async function getUTMPerformance(db: Db, limit = 20, since?: Date) {
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

export async function getTopSearchQueries(db: Db, limit = 20, since?: Date) {
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
