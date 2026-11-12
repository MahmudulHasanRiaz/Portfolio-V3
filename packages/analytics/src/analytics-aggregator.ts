import { getDb, pageViews, visitors, searchAnalytics, visitorSessions } from "@repo/database";
import { count, desc, gte, sql, and } from "drizzle-orm";

const db = getDb();

export interface TrafficSummary {
  totalVisitors: number;
  totalPageViews: number;
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
}

export interface TopPage {
  path: string;
  views: number;
}

export interface TopReferrer {
  referrer: string;
  count: number;
}

export interface UTMPerformance {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  visits: number;
  leads: number;
}

export interface SearchMetric {
  query: string;
  count: number;
}

export class AnalyticsAggregator {
  async getTrafficSummary(since?: Date): Promise<TrafficSummary> {
    const pageViewConditions = since ? [gte(pageViews.timestamp, since)] : [];
    const sessionConditions = since ? [gte(visitorSessions.startTime, since)] : [];

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
      averageSessionDuration: Number.isFinite(avgDuration) ? Math.round(avgDuration) : 0,
      bounceRate:
        totalSessions > 0
          ? Math.round((bounced / totalSessions) * 1000) / 10
          : 0,
    };
  }

  async getTopPages(limit = 20, since?: Date): Promise<TopPage[]> {
    const conditions = since ? [gte(pageViews.timestamp, since)] : [];

    const rows = await db
      .select({
        path: pageViews.path,
        views: count(),
      })
      .from(pageViews)
      .where(and(...conditions))
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(limit);

    return rows;
  }

  async getTopReferrers(limit = 20, since?: Date): Promise<TopReferrer[]> {
    const conditions: ReturnType<typeof gte>[] = [
      sql`${pageViews.referrer} IS NOT NULL`,
      sql`${pageViews.referrer} != ''`,
    ];
    if (since) conditions.push(gte(pageViews.timestamp, since));

    const rows = await db
      .select({
        referrer: pageViews.referrer,
        count: count(),
      })
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

  async getUTMPerformance(limit = 20, since?: Date): Promise<UTMPerformance[]> {
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

  async getTopSearchQueries(limit = 20, since?: Date): Promise<SearchMetric[]> {
    const conditions = since ? [gte(searchAnalytics.createdAt, since)] : [];

    const rows = await db
      .select({
        query: searchAnalytics.query,
        count: count(),
      })
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
}
