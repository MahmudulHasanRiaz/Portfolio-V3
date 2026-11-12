import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import type { SearchIndex, SearchResult } from "../types/search";

export class SearchIndexRepository extends BaseRepository<typeof schema.searchIndex> {
  constructor() {
    super(schema.searchIndex, "searchIndex");
  }

  async searchFTS(params: {
    query: string;
    entityType?: string;
    locale?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ results: SearchResult[]; total: number }> {
    const start = Date.now();
    const { query, entityType, locale, page = 1, pageSize = 20 } = params;

    if (!query || query.trim().length === 0) {
      return { results: [], total: 0 };
    }

    try {
      const sanitizedQuery = query.trim().slice(0, 200);
      const terms = sanitizedQuery.split(/\s+/).filter(Boolean);

      const synonymRows = await this.db
        .select()
        .from(schema.searchSynonyms)
        .where(
          and(
            sql`${schema.searchSynonyms.isEnabled} = true`,
            or(...terms.map((t) => like(schema.searchSynonyms.term, `%${t}%`)))
          )
        )
        .limit(10);

      let tsquery: ReturnType<typeof sql>;
      const synonymTerms = synonymRows
        .flatMap((s) => [s.term, ...(s.synonyms || [])])
        .filter((t): t is string => !!t);

      const allTerms = [...new Set([...terms, ...synonymTerms])];

      if (allTerms.length === 1) {
        tsquery = sql`plainto_tsquery('english', ${sanitizedQuery})`;
      } else {
        const queryStr = allTerms
          .map((t) => t.replace(/[^\w\s-]/g, ""))
          .filter(Boolean)
          .join(" | ");
        tsquery = sql`to_tsquery('english', ${queryStr})`;
      }

      const searchVector = sql`search_vector`;

      const conditions = [sql`${searchVector} @@ ${tsquery}`];

      if (entityType) {
        conditions.push(eq((schema.searchIndex as any).entityType, entityType));
      }
      if (locale) {
        conditions.push(eq((schema.searchIndex as any).locale, locale));
      }

      const whereClause = and(...conditions);

      const countResult = await this.db
        .select({ count: count() })
        .from(schema.searchIndex as any)
        .where(whereClause as any);
      const total = Number(countResult[0]?.count ?? 0);

      if (total === 0) {
        trackQuery(this.entityName, "searchFTS", Date.now() - start);
        return { results: [], total: 0 };
      }

      const offset = (page - 1) * pageSize;
      const rows = await this.db
        .select({
          id: (schema.searchIndex as any).id,
          entityType: (schema.searchIndex as any).entityType,
          entityId: (schema.searchIndex as any).entityId,
          title: (schema.searchIndex as any).title,
          content: (schema.searchIndex as any).content,
          summary: (schema.searchIndex as any).summary,
          url: (schema.searchIndex as any).url,
          thumbnail: (schema.searchIndex as any).thumbnail,
          publishedAt: (schema.searchIndex as any).publishedAt,
          contentType: (schema.searchIndex as any).contentType,
          locale: (schema.searchIndex as any).locale,
          rank: sql<number>`ts_rank(${searchVector}, ${tsquery})`,
          headline: sql<string>`ts_headline('english', coalesce(${(schema.searchIndex as any).content}, ''), ${tsquery}, 'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20')`,
        })
        .from(schema.searchIndex as any)
        .where(whereClause as any)
        .orderBy(desc(sql`ts_rank(${searchVector}, ${tsquery})`))
        .limit(pageSize)
        .offset(offset);

      trackQuery(this.entityName, "searchFTS", Date.now() - start);

      const results: SearchResult[] = rows.map((row) => ({
        id: row.id,
        entityType: row.entityType ?? "",
        entityId: row.entityId ?? "",
        title: row.title ?? "",
        content: row.content ?? "",
        summary: row.summary ?? "",
        url: row.url ?? "",
        thumbnail: row.thumbnail ?? "",
        publishedAt: row.publishedAt ?? null,
        contentType: row.contentType ?? null,
        locale: row.locale ?? null,
        rank: row.rank ?? 0,
        headline: row.headline ?? "",
      }));

      return { results, total };
    } catch (error) {
      trackQuery(this.entityName, "searchFTS", Date.now() - start);
      throw new DatabaseError("Failed to search index", {
        entity: this.entityName,
        operation: "searchFTS",
        cause: error,
      });
    }
  }

  async upsertEntity(data: SearchIndex): Promise<void> {
    const start = Date.now();
    try {
      await this.db
        .insert(schema.searchIndex as any)
        .values({
          entityType: data.entityType,
          entityId: data.entityId,
          title: data.title,
          content: data.content,
          summary: data.summary,
          url: data.url,
          thumbnail: data.thumbnail,
          publishedAt: data.publishedAt,
          contentType: data.contentType,
          locale: data.locale,
        })
        .onConflictDoUpdate({
          target: [(schema.searchIndex as any).entityType, (schema.searchIndex as any).entityId],
          set: {
            title: data.title,
            content: data.content,
            summary: data.summary,
            url: data.url,
            thumbnail: data.thumbnail,
            publishedAt: data.publishedAt,
            contentType: data.contentType,
            locale: data.locale,
          },
        });
      trackQuery(this.entityName, "upsertEntity", Date.now() - start);
    } catch (error) {
      trackQuery(this.entityName, "upsertEntity", Date.now() - start);
      throw new DatabaseError("Failed to upsert search index entity", {
        entity: this.entityName,
        operation: "upsertEntity",
        cause: error,
      });
    }
  }

  async deleteEntity(entityType: string, entityId: string): Promise<void> {
    const start = Date.now();
    try {
      await this.db
        .delete(schema.searchIndex as any)
        .where(
          and(
            eq((schema.searchIndex as any).entityType, entityType),
            eq((schema.searchIndex as any).entityId, entityId)
          )
        );
      trackQuery(this.entityName, "deleteEntity", Date.now() - start);
    } catch (error) {
      trackQuery(this.entityName, "deleteEntity", Date.now() - start);
      throw new DatabaseError("Failed to delete search index entity", {
        entity: this.entityName,
        operation: "deleteEntity",
        cause: error,
      });
    }
  }

  async getEntityCount(entityType?: string): Promise<number> {
    const start = Date.now();
    try {
      const conditions = entityType
        ? [eq((schema.searchIndex as any).entityType, entityType)]
        : [];

      const countResult = await this.db
        .select({ count: count() })
        .from(schema.searchIndex as any)
        .where(and(...conditions) as any);
      const total = Number(countResult[0]?.count ?? 0);

      trackQuery(this.entityName, "getEntityCount", Date.now() - start);
      return total;
    } catch (error) {
      trackQuery(this.entityName, "getEntityCount", Date.now() - start);
      throw new DatabaseError("Failed to count search index entities", {
        entity: this.entityName,
        operation: "getEntityCount",
        cause: error,
      });
    }
  }

  async rebuildIndex(): Promise<void> {
    const start = Date.now();
    try {
      await this.db.delete(schema.searchIndex as any);
      trackQuery(this.entityName, "rebuildIndex", Date.now() - start);
    } catch (error) {
      trackQuery(this.entityName, "rebuildIndex", Date.now() - start);
      throw new DatabaseError("Failed to rebuild search index", {
        entity: this.entityName,
        operation: "rebuildIndex",
        cause: error,
      });
    }
  }
}
