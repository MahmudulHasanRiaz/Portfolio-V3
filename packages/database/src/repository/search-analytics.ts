import { getDb } from "../connection";
import { searchAnalytics } from "../schema/search/search-analytics";
import { desc, count, eq, gte, sql, and } from "drizzle-orm";

export class SearchAnalyticsRepository {
  async logQuery(query: string, entityType?: string, resultCount?: number): Promise<void> {
    if (!query || query.trim().length === 0) return;

    const db = getDb();
    await db.insert(searchAnalytics).values({
      query: query.trim().slice(0, 500),
      entityType: entityType || null,
      resultCount: resultCount ?? 0,
    });
  }

  async getPopularQueries(limit = 20): Promise<Array<{ query: string; count: number }>> {
    const db = getDb();
    const rows = await db
      .select({
        query: searchAnalytics.query,
        count: count(),
      })
      .from(searchAnalytics)
      .groupBy(searchAnalytics.query)
      .orderBy(desc(count()))
      .limit(limit);

    return rows;
  }

  async getTotalQueries(since?: Date): Promise<number> {
    const db = getDb();
    const conditions = since
      ? [gte(searchAnalytics.createdAt, since)]
      : [];

    const [result] = await db
      .select({ count: count() })
      .from(searchAnalytics)
      .where(and(...conditions));

    return result?.count ?? 0;
  }

  async getQueriesByEntityType(limit = 10): Promise<Array<{ entityType: string; count: number }>> {
    const db = getDb();
    const rows = await db
      .select({
        entityType: searchAnalytics.entityType,
        count: count(),
      })
      .from(searchAnalytics)
      .where(sql`${searchAnalytics.entityType} IS NOT NULL`)
      .groupBy(searchAnalytics.entityType)
      .orderBy(desc(count()))
      .limit(limit);

    return rows as Array<{ entityType: string; count: number }>;
  }

  async getZeroResultQueries(limit = 20): Promise<Array<{ query: string; count: number }>> {
    const db = getDb();
    const rows = await db
      .select({
        query: searchAnalytics.query,
        count: count(),
      })
      .from(searchAnalytics)
      .where(eq(searchAnalytics.resultCount, 0))
      .groupBy(searchAnalytics.query)
      .orderBy(desc(count()))
      .limit(limit);

    return rows;
  }
}
