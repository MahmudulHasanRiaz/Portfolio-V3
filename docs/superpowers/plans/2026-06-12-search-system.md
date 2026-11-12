# Phase 12 — Search System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build PostgreSQL Full Text Search with search_index aggregation layer, sync hooks, search API, synonym management, dashboard management pages, and analytics foundation.

**Architecture:** PostgreSQL FTS (tsvector/tsquery) as query engine. search_index table with generated tsvector column. Application-layer sync hooks on content publish/update/delete. No external search engines.

**Tech Stack:** PostgreSQL, Drizzle ORM, postgres.js, Next.js Route Handlers, `packages/ui` components.

---

## File Structure

### Modified Files
- `packages/database/src/schema/search/search-index.ts` — Add tsvector generated column
- `packages/database/src/schema/search/search-synonyms.ts` — Add is_enabled column
- `packages/database/src/schema/search/index.ts` — Re-export search-analytics
- `packages/database/src/repository/search.ts` — Rewrite with FTS, upsert, delete, stats, analytics
- `packages/database/src/repository/index.ts` — Export SearchAnalyticsRepository
- `apps/dashboard/src/lib/navigation.ts` — Add Search nav entry
- `apps/dashboard/src/middleware.ts` — Add `/api/search` to public routes

### Created Files
- `packages/database/src/schema/search/search-analytics.ts` — search_analytics table
- `packages/database/src/services/search-indexer.ts` — Indexing logic for all 10 sources
- `apps/dashboard/src/app/api/search/route.ts` — GET public search
- `apps/dashboard/src/app/api/search/rebuild/route.ts` — POST admin rebuild
- `apps/dashboard/src/app/api/search/synonyms/route.ts` — GET/POST synonyms CRUD
- `apps/dashboard/src/app/api/search/synonyms/[id]/route.ts` — PUT/DELETE synonym
- `apps/dashboard/src/app/dashboard/search/page.tsx` — Search overview
- `apps/dashboard/src/app/dashboard/search/synonyms/page.tsx` — Synonym manager
- `docs/superpowers/reports/PHASE12_REVIEW.md`
- `docs/superpowers/reports/PHASE12_REPORT.md`
- `docs/superpowers/reports/PHASE12_ACCEPTANCE_REPORT.md`
- `docs/superpowers/reports/PHASE12_CLOSEOUT_REPORT.md`

---

### Task 1: Schema Changes

**Files:**
- Modify: `packages/database/src/schema/search/search-index.ts`
- Modify: `packages/database/src/schema/search/search-synonyms.ts`
- Create: `packages/database/src/schema/search/search-analytics.ts`
- Modify: `packages/database/src/schema/search/index.ts` (if exists) or `packages/database/src/schema/index.ts`

- [ ] **Step 1: Update search_index schema — keep existing columns**

The existing `search_index` Drizzle schema stays as-is. The tsvector column and GIN index will be added via migration SQL only (no Drizzle column definition needed — referenced via raw SQL in queries).

Modify `packages/database/src/schema/search/search-index.ts` to add only the entity composite index:

```typescript
import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";

export const searchIndex = pgTable("search_index", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  title: text("title"),
  content: text("content"),
  summary: text("summary"),
  url: text("url"),
  thumbnail: text("thumbnail"),
  publishedAt: timestamp("published_at"),
  contentType: varchar("content_type", { length: 50 }),
  locale: varchar("locale", { length: 10 }),
}, (table) => ({
  entityIdx: index("idx_search_index_entity").on(table.entityType, table.entityId),
}));
```

- [ ] **Step 2: Add is_enabled to search_synonyms schema**

Modify `packages/database/src/schema/search/search-synonyms.ts`:

```typescript
import { pgTable, uuid, varchar, text, boolean } from "drizzle-orm/pg-core";

export const searchSynonyms = pgTable("search_synonyms", {
  id: uuid("id").primaryKey().defaultRandom(),
  term: varchar("term", { length: 255 }),
  synonyms: text("synonyms").array(),
  isEnabled: boolean("is_enabled").notNull().default(true),
});
```

- [ ] **Step 3: Create search_analytics schema**

Create `packages/database/src/schema/search/search-analytics.ts`:

```typescript
import { pgTable, uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const searchAnalytics = pgTable("search_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  query: text("query").notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  resultCount: integer("result_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```

- [ ] **Step 4: Export new schemas**

Ensure `packages/database/src/schema/index.ts` exports the new file by adding:
```
export * from "./search/search-analytics";
```

- [ ] **Step 5: Generate and run migration**

```bash
cd packages/database
npx drizzle-kit generate
```

Review the generated migration SQL then apply it. The migration should add the `search_vector` tsvector column and GIN index to `search_index`, add `is_enabled` to `search_synonyms`, and create `search_analytics` table.

```bash
npx drizzle-kit migrate
```

- [ ] **Step 6: Commit**

```bash
git add packages/database/src/schema/search/
git add packages/database/drizzle/
git commit -m "feat: add tsvector to search_index, is_enabled to search_synonyms, search_analytics table"
```

---

### Task 2: FTS Search Index Repository

**Files:**
- Rewrite: `packages/database/src/repository/search.ts`
- Create: `packages/database/src/services/search-indexer.ts`

- [ ] **Step 1: Rewrite SearchIndexRepository with FTS**

Modify `packages/database/src/repository/search.ts` to replace the ILIKE `search()` method with FTS-based `searchFTS()`, and add `upsert()`, `deleteByEntity()`, `countByEntityType()`, `getTotalCount()`, and analytics methods:

```typescript
import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, and, sql, count } from "drizzle-orm";

export interface SearchFilters {
  q: string;
  entityType?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  id: string;
  entityType: string | null;
  entityId: string | null;
  title: string | null;
  content: string | null;
  summary: string | null;
  url: string | null;
  thumbnail: string | null;
  publishedAt: string | null;
  contentType: string | null;
  rank: number | null;
  headline: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IndexStats {
  entityType: string;
  count: number;
}

export class SearchIndexRepository extends BaseRepository<typeof schema.searchIndex> {
  constructor() {
    super(schema.searchIndex, "searchIndex");
  }

  async findByEntity(entityType: string, entityId: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(
          and(
            eq(schema.searchIndex.entityType, entityType),
            eq(schema.searchIndex.entityId, entityId),
          )
        )
        .limit(1);
      trackQuery(this.entityName, "findByEntity", Date.now() - start);
      return result || null;
    } catch (error) {
      trackQuery(this.entityName, "findByEntity", Date.now() - start);
      throw new DatabaseError("Failed to find search index by entity", { entity: this.entityName, operation: "findByEntity", cause: error });
    }
  }

  async upsert(data: {
    entityType: string;
    entityId: string;
    title?: string | null;
    content?: string | null;
    summary?: string | null;
    url?: string | null;
    thumbnail?: string | null;
    publishedAt?: Date | string | null;
    contentType?: string | null;
    locale?: string | null;
  }) {
    const start = Date.now();
    try {
      const existing = await this.findByEntity(data.entityType, data.entityId);
      if (existing) {
        const [result] = await this.db
          .update(this.table)
          .set({
            title: data.title ?? existing.title,
            content: data.content ?? existing.content,
            summary: data.summary ?? existing.summary,
            url: data.url ?? existing.url,
            thumbnail: data.thumbnail ?? existing.thumbnail,
            publishedAt: data.publishedAt ? new Date(data.publishedAt) : existing.publishedAt,
            contentType: data.contentType ?? existing.contentType,
            locale: data.locale ?? existing.locale,
          })
          .where(eq(schema.searchIndex.id, existing.id))
          .returning();
        trackQuery(this.entityName, "upsert", Date.now() - start);
        return result;
      }
      const [result] = await this.db
        .insert(this.table)
        .values({
          entityType: data.entityType,
          entityId: data.entityId,
          title: data.title,
          content: data.content,
          summary: data.summary,
          url: data.url,
          thumbnail: data.thumbnail,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
          contentType: data.contentType,
          locale: data.locale,
        })
        .returning();
      trackQuery(this.entityName, "upsert", Date.now() - start);
      return result;
    } catch (error) {
      trackQuery(this.entityName, "upsert", Date.now() - start);
      throw new DatabaseError("Failed to upsert search index", { entity: this.entityName, operation: "upsert", cause: error });
    }
  }

  async deleteByEntity(entityType: string, entityId: string) {
    const start = Date.now();
    try {
      await this.db
        .delete(this.table)
        .where(
          and(
            eq(schema.searchIndex.entityType, entityType),
            eq(schema.searchIndex.entityId, entityId),
          )
        );
      trackQuery(this.entityName, "deleteByEntity", Date.now() - start);
    } catch (error) {
      trackQuery(this.entityName, "deleteByEntity", Date.now() - start);
      throw new DatabaseError("Failed to delete search index", { entity: this.entityName, operation: "deleteByEntity", cause: error });
    }
  }

  async searchFTS(filters: SearchFilters): Promise<SearchResponse> {
    const start = Date.now();
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;
    const query = filters.q?.trim() || "";

    try {
      let whereClause = sql`1=1`;

      const searchVector = sql`search_index.search_vector`;

      if (query) {
        const tsquery = sql`plainto_tsquery('english', ${query})`;
        whereClause = sql`${searchVector} @@ ${tsquery}`;
      }

      if (filters.entityType) {
        whereClause = sql`${whereClause} AND ${schema.searchIndex.entityType} = ${filters.entityType}`;
      }

      const tsquery = query
        ? sql`plainto_tsquery('english', ${query})`
        : sql`null::tsquery`;

      const countResult = await this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(this.table)
        .where(whereClause);

      const total = Number(countResult[0]?.total ?? 0);

      const results = await this.db
        .select({
          id: schema.searchIndex.id,
          entityType: schema.searchIndex.entityType,
          entityId: schema.searchIndex.entityId,
          title: schema.searchIndex.title,
          content: schema.searchIndex.content,
          summary: schema.searchIndex.summary,
          url: schema.searchIndex.url,
          thumbnail: schema.searchIndex.thumbnail,
          publishedAt: schema.searchIndex.publishedAt,
          contentType: schema.searchIndex.contentType,
          rank: sql<number | null>`
            CASE WHEN ${tsquery} IS NOT NULL
              THEN ts_rank(${searchVector}, ${tsquery})
              ELSE null
            END
          `,
          headline: sql<string | null>`
            CASE WHEN ${tsquery} IS NOT NULL
              THEN ts_headline('english', coalesce(${schema.searchIndex.content}, ''), ${tsquery},
                'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20')
              ELSE null
            END
          `,
        })
        .from(this.table)
        .where(whereClause)
        .orderBy(
          query
            ? sql`ts_rank(${searchVector}, ${tsquery}) DESC`
            : sql`${schema.searchIndex.publishedAt} DESC NULLS LAST`
        )
        .limit(pageSize)
        .offset(offset);

      trackQuery(this.entityName, "searchFTS", Date.now() - start);
      return {
        results: results as SearchResult[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      trackQuery(this.entityName, "searchFTS", Date.now() - start);
      throw new DatabaseError("Failed to search", { entity: this.entityName, operation: "searchFTS", cause: error });
    }
  }

  async countByEntityType(): Promise<IndexStats[]> {
    const start = Date.now();
    try {
      const results = await this.db
        .select({
          entityType: schema.searchIndex.entityType,
          count: sql<number>`count(*)::int`,
        })
        .from(this.table)
        .groupBy(schema.searchIndex.entityType)
        .orderBy(schema.searchIndex.entityType);
      trackQuery(this.entityName, "countByEntityType", Date.now() - start);
      return results as IndexStats[];
    } catch (error) {
      trackQuery(this.entityName, "countByEntityType", Date.now() - start);
      throw new DatabaseError("Failed to count by entity type", { entity: this.entityName, operation: "countByEntityType", cause: error });
    }
  }

  async getTotalCount(): Promise<number> {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(this.table);
      trackQuery(this.entityName, "getTotalCount", Date.now() - start);
      return Number(result?.total ?? 0);
    } catch (error) {
      trackQuery(this.entityName, "getTotalCount", Date.now() - start);
      throw new DatabaseError("Failed to count search index", { entity: this.entityName, operation: "getTotalCount", cause: error });
    }
  }

  async findByContentType(contentType: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq(schema.searchIndex.contentType, contentType));
      trackQuery(this.entityName, "findByContentType", Date.now() - start);
      return results;
    } catch (error) {
      trackQuery(this.entityName, "findByContentType", Date.now() - start);
      throw new DatabaseError("Failed to find by content type", { entity: this.entityName, operation: "findByContentType", cause: error });
    }
  }
}
```

- [ ] **Step 2: Create search-analytics repository**

Create `packages/database/src/repository/search-analytics.ts`:

```typescript
import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { sql, desc, gte } from "drizzle-orm";

export interface TopQuery {
  query: string;
  count: number;
  lastSearched: string | null;
}

export class SearchAnalyticsRepository extends BaseRepository<typeof schema.searchAnalytics> {
  constructor() {
    super(schema.searchAnalytics, "searchAnalytics");
  }

  async logSearch(query: string, entityType: string | null, resultCount: number) {
    const start = Date.now();
    try {
      await this.db.insert(this.table).values({
        query,
        entityType,
        resultCount,
      });
      trackQuery(this.entityName, "logSearch", Date.now() - start);
    } catch (error) {
      trackQuery(this.entityName, "logSearch", Date.now() - start);
      throw new DatabaseError("Failed to log search", { entity: this.entityName, operation: "logSearch", cause: error });
    }
  }

  async getTopQueries(limit = 10, since?: Date): Promise<TopQuery[]> {
    const start = Date.now();
    try {
      let whereClause = sql`1=1`;
      if (since) {
        whereClause = gte(schema.searchAnalytics.createdAt, since);
      }
      const results = await this.db
        .select({
          query: schema.searchAnalytics.query,
          count: sql<number>`count(*)::int`,
          lastSearched: sql<string | null>`max(${schema.searchAnalytics.createdAt})`,
        })
        .from(this.table)
        .where(whereClause)
        .groupBy(schema.searchAnalytics.query)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);
      trackQuery(this.entityName, "getTopQueries", Date.now() - start);
      return results as TopQuery[];
    } catch (error) {
      trackQuery(this.entityName, "getTopQueries", Date.now() - start);
      throw new DatabaseError("Failed to get top queries", { entity: this.entityName, operation: "getTopQueries", cause: error });
    }
  }

  async getQueryCount(since?: Date): Promise<number> {
    const start = Date.now();
    try {
      let whereClause = sql`1=1`;
      if (since) {
        whereClause = gte(schema.searchAnalytics.createdAt, since);
      }
      const [result] = await this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(this.table)
        .where(whereClause);
      trackQuery(this.entityName, "getQueryCount", Date.now() - start);
      return Number(result?.total ?? 0);
    } catch (error) {
      trackQuery(this.entityName, "getQueryCount", Date.now() - start);
      throw new DatabaseError("Failed to get query count", { entity: this.entityName, operation: "getQueryCount", cause: error });
    }
  }

  async getNoResultQueries(limit = 10): Promise<TopQuery[]> {
    const start = Date.now();
    try {
      const results = await this.db
        .select({
          query: schema.searchAnalytics.query,
          count: sql<number>`count(*)::int`,
          lastSearched: sql<string | null>`max(${schema.searchAnalytics.createdAt})`,
        })
        .from(this.table)
        .where(eq(schema.searchAnalytics.resultCount, 0))
        .groupBy(schema.searchAnalytics.query)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);
      trackQuery(this.entityName, "getNoResultQueries", Date.now() - start);
      return results as TopQuery[];
    } catch (error) {
      trackQuery(this.entityName, "getNoResultQueries", Date.now() - start);
      throw new DatabaseError("Failed to get no-result queries", { entity: this.entityName, operation: "getNoResultQueries", cause: error });
    }
  }
}
```

- [ ] **Step 3: Export SearchAnalyticsRepository**

Add to `packages/database/src/repository/index.ts`:

```typescript
export {
  SearchAnalyticsRepository,
} from "./search-analytics";
```

Also update the existing SearchIndexRepository export if needed (it should already be exported).

- [ ] **Step 4: Commit**

```bash
git add packages/database/src/repository/search.ts
git add packages/database/src/repository/search-analytics.ts
git add packages/database/src/repository/index.ts
git commit -m "feat: FTS search repository, search-analytics repository"
```

---

### Task 3: Indexing Service

**Files:**
- Create: `packages/database/src/services/search-indexer.ts`

- [ ] **Step 1: Create the search-indexer service**

Create `packages/database/src/services/search-indexer.ts` with indexing for all 10 source types:

```typescript
import { getDb } from "../connection";
import { SearchIndexRepository, SearchAnalyticsRepository } from "../repository";
import * as schema from "../schema";
import { eq, and, sql } from "drizzle-orm";

const ENTITY_TYPES = [
  "page", "post", "service", "project", "case_study",
  "faq", "timeline_event", "venture", "product", "release",
] as const;

type EntityType = (typeof ENTITY_TYPES)[number];

interface SourceMapping {
  entityType: EntityType;
  fetchPublished: () => Promise<any[]>;
  fetchOne: (id: string) => Promise<any | null>;
  mapToIndex: (row: any) => {
    title: string | null;
    content: string | null;
    summary: string | null;
    url: string | null;
    thumbnail: string | null;
    publishedAt: Date | null;
    contentType: string | null;
    locale: string | null;
  } | null;
}

export class SearchIndexerService {
  private searchRepo: SearchIndexRepository;

  constructor() {
    this.searchRepo = new SearchIndexRepository();
  }

  private get db() {
    return getDb();
  }

  private getMappings(): SourceMapping[] {
    return [
      {
        entityType: "page",
        fetchPublished: () =>
          this.db.select().from(schema.pages).where(eq(schema.pages.status, "published")),
        fetchOne: (id: string) =>
          this.db.select().from(schema.pages).where(and(eq(schema.pages.id, id), eq(schema.pages.status, "published"))).limit(1).then(r => r[0] || null),
        mapToIndex: (row) => ({
          title: row.title,
          content: row.content,
          summary: null,
          url: row.slug ? `/pages/${row.slug}` : null,
          thumbnail: null,
          publishedAt: row.createdAt ? new Date(row.createdAt) : null,
          contentType: "page",
          locale: null,
        }),
      },
      {
        entityType: "post",
        fetchPublished: () =>
          this.db.select().from(schema.posts).where(eq(schema.posts.status, "published")),
        fetchOne: (id: string) =>
          this.db.select().from(schema.posts).where(and(eq(schema.posts.id, id), eq(schema.posts.status, "published"))).limit(1).then(r => r[0] || null),
        mapToIndex: (row) => ({
          title: row.title,
          content: row.content,
          summary: row.excerpt,
          url: row.slug ? `/blog/${row.slug}` : null,
          thumbnail: null,
          publishedAt: row.createdAt ? new Date(row.createdAt) : null,
          contentType: "post",
          locale: null,
        }),
      },
      {
        entityType: "service",
        fetchPublished: () =>
          this.db.select().from(schema.services).where(eq(schema.services.status, "published")),
        fetchOne: (id: string) =>
          this.db.select().from(schema.services).where(and(eq(schema.services.id, id), eq(schema.services.status, "published"))).limit(1).then(r => r[0] || null),
        mapToIndex: (row) => ({
          title: row.title,
          content: row.description,
          summary: row.summary,
          url: row.slug ? `/services/${row.slug}` : null,
          thumbnail: null,
          publishedAt: row.createdAt ? new Date(row.createdAt) : null,
          contentType: "service",
          locale: null,
        }),
      },
      {
        entityType: "project",
        fetchPublished: () =>
          this.db.select().from(schema.projects).where(eq(schema.projects.status, "published")),
        fetchOne: (id: string) =>
          this.db.select().from(schema.projects).where(and(eq(schema.projects.id, id), eq(schema.projects.status, "published"))).limit(1).then(r => r[0] || null),
        mapToIndex: (row) => ({
          title: row.title,
          content: row.description,
          summary: row.summary,
          url: row.slug ? `/projects/${row.slug}` : null,
          thumbnail: null,
          publishedAt: row.createdAt ? new Date(row.createdAt) : null,
          contentType: "project",
          locale: null,
        }),
      },
      {
        entityType: "case_study",
        fetchPublished: () =>
          this.db.select().from(schema.caseStudies).where(eq(schema.caseStudies.status, "published")),
        fetchOne: (id: string) =>
          this.db.select().from(schema.caseStudies).where(and(eq(schema.caseStudies.id, id), eq(schema.caseStudies.status, "published"))).limit(1).then(r => r[0] || null),
        mapToIndex: (row) => ({
          title: row.title,
          content: [row.challenge, row.research, row.strategy, row.results].filter(Boolean).join("\n\n"),
          summary: row.challenge,
          url: row.slug ? `/case-studies/${row.slug}` : null,
          thumbnail: null,
          publishedAt: row.createdAt ? new Date(row.createdAt) : null,
          contentType: "case_study",
          locale: null,
        }),
      },
      {
        entityType: "faq",
        fetchPublished: () =>
          this.db.select().from(schema.faqs),
        fetchOne: (id: string) =>
          this.db.select().from(schema.faqs).where(eq(schema.faqs.id, id)).limit(1).then(r => r[0] || null),
        mapToIndex: (row) => ({
          title: row.question,
          content: row.answer,
          summary: null,
          url: null,
          thumbnail: null,
          publishedAt: null,
          contentType: "faq",
          locale: null,
        }),
      },
      {
        entityType: "timeline_event",
        fetchPublished: () =>
          this.db.select().from(schema.timelineEvents),
        fetchOne: (id: string) =>
          this.db.select().from(schema.timelineEvents).where(eq(schema.timelineEvents.id, id)).limit(1).then(r => r[0] || null),
        mapToIndex: (row) => ({
          title: row.title,
          content: row.description,
          summary: null,
          url: row.url || null,
          thumbnail: null,
          publishedAt: row.eventDate ? new Date(row.eventDate) : null,
          contentType: "timeline_event",
          locale: null,
        }),
      },
      {
        entityType: "venture",
        fetchPublished: () =>
          this.db.select().from(schema.ventures).where(eq(schema.ventures.contentStatus, "published")),
        fetchOne: (id: string) =>
          this.db.select().from(schema.ventures).where(and(eq(schema.ventures.id, id), eq(schema.ventures.contentStatus, "published"))).limit(1).then(r => r[0] || null),
        mapToIndex: (row) => ({
          title: row.name,
          content: row.description,
          summary: null,
          url: row.slug ? `/ventures/${row.slug}` : null,
          thumbnail: row.logo || null,
          publishedAt: row.createdAt ? new Date(row.createdAt) : null,
          contentType: "venture",
          locale: null,
        }),
      },
      {
        entityType: "product",
        fetchPublished: () =>
          this.db.select().from(schema.products).where(eq(schema.products.contentStatus, "published")),
        fetchOne: (id: string) =>
          this.db.select().from(schema.products).where(and(eq(schema.products.id, id), eq(schema.products.contentStatus, "published"))).limit(1).then(r => r[0] || null),
        mapToIndex: (row) => ({
          title: row.name,
          content: row.description,
          summary: null,
          url: row.slug ? `/ventures/products/${row.slug}` : null,
          thumbnail: null,
          publishedAt: row.createdAt ? new Date(row.createdAt) : null,
          contentType: "product",
          locale: null,
        }),
      },
      {
        entityType: "release",
        fetchPublished: () =>
          this.db.select().from(schema.releases).where(eq(schema.releases.status, "published")),
        fetchOne: (id: string) =>
          this.db.select().from(schema.releases).where(and(eq(schema.releases.id, id), eq(schema.releases.status, "published"))).limit(1).then(r => r[0] || null),
        mapToIndex: (row) => ({
          title: row.title,
          content: row.description,
          summary: null,
          url: row.slug ? `/releases/${row.slug}` : null,
          thumbnail: row.coverImage || null,
          publishedAt: row.releaseDate ? new Date(row.releaseDate) : null,
          contentType: "release",
          locale: null,
        }),
      },
    ];
  }

  async indexEntity(entityType: string, entityId: string): Promise<void> {
    const mapping = this.getMappings().find((m) => m.entityType === entityType);
    if (!mapping) return;

    const row = await mapping.fetchOne(entityId);
    if (!row) {
      await this.searchRepo.deleteByEntity(entityType, entityId);
      return;
    }

    const mapped = mapping.mapToIndex(row);
    if (!mapped) return;

    await this.searchRepo.upsert({
      entityType,
      entityId,
      ...mapped,
    });
  }

  async deleteEntity(entityType: string, entityId: string): Promise<void> {
    await this.searchRepo.deleteByEntity(entityType, entityId);
  }

  async rebuildIndex(entityType?: string): Promise<{ indexed: number; errors: string[] }> {
    let indexed = 0;
    const errors: string[] = [];

    const mappings = entityType
      ? this.getMappings().filter((m) => m.entityType === entityType)
      : this.getMappings();

    if (entityType) {
      await this.db.delete(schema.searchIndex).where(eq(schema.searchIndex.entityType, entityType));
    } else {
      await this.db.delete(schema.searchIndex);
    }

    for (const mapping of mappings) {
      try {
        const rows = await mapping.fetchPublished();
        for (const row of rows) {
          const mapped = mapping.mapToIndex(row);
          if (mapped) {
            await this.searchRepo.upsert({
              entityType: mapping.entityType,
              entityId: row.id,
              ...mapped,
            });
            indexed++;
          }
        }
      } catch (err) {
        errors.push(`${mapping.entityType}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return { indexed, errors };
  }

  async getStats() {
    return this.searchRepo.countByEntityType();
  }

  async getTotalCount() {
    return this.searchRepo.getTotalCount();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/database/src/services/search-indexer.ts
git commit -m "feat: search indexer service for all 10 source types"
```

---

### Task 4: Search API Routes

**Files:**
- Create: `apps/dashboard/src/app/api/search/route.ts`
- Create: `apps/dashboard/src/app/api/search/rebuild/route.ts`
- Create: `apps/dashboard/src/app/api/search/synonyms/route.ts`
- Create: `apps/dashboard/src/app/api/search/synonyms/[id]/route.ts`
- Modify: `apps/dashboard/src/middleware.ts`

- [ ] **Step 1: Create public search endpoint**

`apps/dashboard/src/app/api/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { SearchIndexRepository, SearchAnalyticsRepository } from "@repo/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const entityType = searchParams.get("type") || undefined;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    if (!q.trim() && !entityType) {
      return NextResponse.json({ results: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    }

    const repo = new SearchIndexRepository();
    const analyticsRepo = new SearchAnalyticsRepository();

    const result = await repo.searchFTS({ q: q.trim(), entityType, page, pageSize });

    // Async log — don't block response
    analyticsRepo.logSearch(q.trim(), entityType || null, result.total).catch(() => {});

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create admin rebuild endpoint**

`apps/dashboard/src/app/api/search/rebuild/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { SearchIndexerService } from "@repo/database";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const entityType: string | undefined = body.entityType || undefined;

    const indexer = new SearchIndexerService();
    const result = await indexer.rebuildIndex(entityType);

    return NextResponse.json({
      indexed: result.indexed,
      errors: result.errors,
      message: `Indexed ${result.indexed} documents${result.errors.length ? ` with ${result.errors.length} errors` : ""}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rebuild failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create synonyms list/create endpoint**

`apps/dashboard/src/app/api/search/synonyms/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@repo/database";
import * as schema from "@repo/database";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const results = await db
      .select()
      .from(schema.searchSynonyms)
      .orderBy(asc(schema.searchSynonyms.term));
    return NextResponse.json({ synonyms: results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch synonyms" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { term, synonyms, isEnabled } = body;

    if (!term || !synonyms || !Array.isArray(synonyms) || synonyms.length === 0) {
      return NextResponse.json(
        { error: "term and synonyms (non-empty array) are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [result] = await db
      .insert(schema.searchSynonyms)
      .values({
        term,
        synonyms,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      })
      .returning();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create synonym" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Create synonyms update/delete endpoint**

`apps/dashboard/src/app/api/search/synonyms/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@repo/database";
import * as schema from "@repo/database";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const existing = await db
      .select()
      .from(schema.searchSynonyms)
      .where(eq(schema.searchSynonyms.id, id))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Synonym not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.term !== undefined) updateData.term = body.term;
    if (body.synonyms !== undefined) updateData.synonyms = body.synonyms;
    if (body.isEnabled !== undefined) updateData.isEnabled = body.isEnabled;

    const [result] = await db
      .update(schema.searchSynonyms)
      .set(updateData)
      .where(eq(schema.searchSynonyms.id, id))
      .returning();

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update synonym" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = await db
      .select()
      .from(schema.searchSynonyms)
      .where(eq(schema.searchSynonyms.id, id))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Synonym not found" }, { status: 404 });
    }

    await db.delete(schema.searchSynonyms).where(eq(schema.searchSynonyms.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete synonym" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Add `/api/search` to dashboard middleware public routes**

In `apps/dashboard/src/middleware.ts`, add `/api/search` to the public prefix array (after `/api/health`):

Add a condition:
```
pathname.startsWith("/api/search") ||
```

- [ ] **Step 6: Verify typecheck passes for API routes**

```bash
cd apps/dashboard
npx tsc --noEmit 2>&1 | head -50
```

Fix any type errors.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/src/app/api/search/
git add apps/dashboard/src/middleware.ts
git commit -m "feat: search API routes (public search, admin rebuild, synonyms CRUD)"
```

---

### Task 5: Dashboard Search Management Pages

**Files:**
- Create: `apps/dashboard/src/app/dashboard/search/page.tsx`
- Create: `apps/dashboard/src/app/dashboard/search/synonyms/page.tsx`
- Modify: `apps/dashboard/src/lib/navigation.ts`

- [ ] **Step 1: Create search API route for analytics stats**

Before the dashboard pages, we need a stats endpoint. Create `apps/dashboard/src/app/api/search/stats/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { SearchIndexerService, SearchAnalyticsRepository } from "@repo/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const indexer = new SearchIndexerService();
    const analyticsRepo = new SearchAnalyticsRepository();

    const totalCount = await indexer.getTotalCount();
    const stats = await indexer.getStats();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayCount, weekCount, monthCount, topQueries, noResultQueries] = await Promise.all([
      analyticsRepo.getQueryCount(todayStart),
      analyticsRepo.getQueryCount(weekStart),
      analyticsRepo.getQueryCount(monthStart),
      analyticsRepo.getTopQueries(10),
      analyticsRepo.getNoResultQueries(10),
    ]);

    return NextResponse.json({
      totalCount,
      stats,
      analytics: {
        today: todayCount,
        week: weekCount,
        month: monthCount,
        topQueries,
        noResultQueries,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create search overview page**

`apps/dashboard/src/app/dashboard/search/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@repo/ui";
import { Search, RefreshCw, BarChart3, FileText } from "lucide-react";

interface IndexStat {
  entityType: string;
  count: number;
}

interface TopQuery {
  query: string;
  count: number;
  lastSearched: string | null;
}

interface StatsData {
  totalCount: number;
  stats: IndexStat[];
  analytics: {
    today: number;
    week: number;
    month: number;
    topQueries: TopQuery[];
    noResultQueries: TopQuery[];
  };
}

export default function SearchOverviewPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildMessage, setRebuildMessage] = useState("");

  const fetchStats = useCallback(() => {
    setLoading(true);
    fetch("/api/search/stats")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function handleRebuild(type?: string) {
    setRebuilding(true);
    setRebuildMessage("");
    try {
      const res = await fetch("/api/search/rebuild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: type ? JSON.stringify({ entityType: type }) : "{}",
      });
      const result = await res.json();
      setRebuildMessage(result.message || `Indexed ${result.indexed} documents`);
      fetchStats();
    } catch {
      setRebuildMessage("Rebuild failed");
    } finally {
      setRebuilding(false);
    }
  }

  const entityLabels: Record<string, string> = {
    page: "Pages",
    post: "Blog Posts",
    service: "Services",
    project: "Projects",
    case_study: "Case Studies",
    faq: "FAQs",
    timeline_event: "Timeline Events",
    venture: "Ventures",
    product: "Products",
    release: "Releases",
  };

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Search Overview</h1>
        <Button onClick={() => handleRebuild()} disabled={rebuilding}>
          <RefreshCw size={16} style={{ marginRight: 4 }} />
          {rebuilding ? "Rebuilding..." : "Rebuild All"}
        </Button>
      </div>

      {rebuildMessage && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--success)", color: "var(--success-foreground)" }}>
          {rebuildMessage}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card>
          <CardContent style={{ display: "flex", alignItems: "center", gap: 12, padding: 20 }}>
            <div style={{ padding: 10, borderRadius: 10, backgroundColor: "var(--muted)" }}>
              <Search size={22} style={{ color: "var(--text-primary)" }} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{data?.totalCount ?? 0}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Indexed Documents</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ display: "flex", alignItems: "center", gap: 12, padding: 20 }}>
            <div style={{ padding: 10, borderRadius: 10, backgroundColor: "var(--muted)" }}>
              <BarChart3 size={22} style={{ color: "var(--text-primary)" }} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{data?.analytics.today ?? 0}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Searches Today</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ display: "flex", alignItems: "center", gap: 12, padding: 20 }}>
            <div style={{ padding: 10, borderRadius: 10, backgroundColor: "var(--muted)" }}>
              <BarChart3 size={22} style={{ color: "var(--text-primary)" }} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{data?.analytics.week ?? 0}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Searches This Week</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ display: "flex", alignItems: "center", gap: 12, padding: 20 }}>
            <div style={{ padding: 10, borderRadius: 10, backgroundColor: "var(--muted)" }}>
              <BarChart3 size={22} style={{ color: "var(--text-primary)" }} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{data?.analytics.month ?? 0}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Searches This Month</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <Card>
          <CardHeader><CardTitle>Index by Content Type</CardTitle></CardHeader>
          <CardContent>
            {data?.stats && data.stats.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.stats.map((s) => (
                  <div key={s.entityType} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 6, backgroundColor: "var(--muted)" }}>
                    <span style={{ fontSize: 14 }}>{entityLabels[s.entityType] || s.entityType}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge variant="secondary">{s.count}</Badge>
                      <button
                        onClick={() => handleRebuild(s.entityType)}
                        disabled={rebuilding}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brand)", fontSize: 12 }}
                      >
                        Rebuild
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No indexed documents yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Search Queries</CardTitle></CardHeader>
          <CardContent>
            {data?.analytics.topQueries && data.analytics.topQueries.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.analytics.topQueries.map((q, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderRadius: 6, backgroundColor: "var(--muted)" }}>
                    <span style={{ fontSize: 14 }}>{q.query}</span>
                    <Badge variant="secondary">{q.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No searches yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Zero-Result Queries</CardTitle></CardHeader>
        <CardContent>
          {data?.analytics.noResultQueries && data.analytics.noResultQueries.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.analytics.noResultQueries.map((q, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderRadius: 6, backgroundColor: "var(--muted)" }}>
                  <span style={{ fontSize: 14 }}>{q.query}</span>
                  <Badge variant="secondary">{q.count} times</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No zero-result queries</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create synonym manager page**

`apps/dashboard/src/app/dashboard/search/synonyms/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, Textarea } from "@repo/ui";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

interface Synonym {
  id: string;
  term: string;
  synonyms: string[];
  isEnabled: boolean;
}

export default function SynonymManagerPage() {
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [synonymInput, setSynonymInput] = useState("");
  const [message, setMessage] = useState("");

  const fetchSynonyms = useCallback(() => {
    setLoading(true);
    fetch("/api/search/synonyms")
      .then((r) => r.json())
      .then((res) => setSynonyms(res.synonyms || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSynonyms();
  }, [fetchSynonyms]);

  function resetForm() {
    setTerm("");
    setSynonymInput("");
    setEditingId(null);
    setShowForm(false);
    setMessage("");
  }

  async function handleSave() {
    if (!term.trim() || !synonymInput.trim()) {
      setMessage("Term and synonyms are required");
      return;
    }
    const synonymsArray = synonymInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (synonymsArray.length === 0) {
      setMessage("At least one synonym is required");
      return;
    }

    try {
      const url = editingId ? `/api/search/synonyms/${editingId}` : "/api/search/synonyms";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: term.trim(), synonyms: synonymsArray }),
      });

      if (res.ok) {
        resetForm();
        fetchSynonyms();
        setMessage("");
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to save");
      }
    } catch {
      setMessage("Connection error");
    }
  }

  async function handleToggle(synonym: Synonym) {
    try {
      const res = await fetch(`/api/search/synonyms/${synonym.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !synonym.isEnabled }),
      });
      if (res.ok) fetchSynonyms();
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this synonym group?")) return;
    try {
      const res = await fetch(`/api/search/synonyms/${id}`, { method: "DELETE" });
      if (res.ok) fetchSynonyms();
    } catch { /* ignore */ }
  }

  function startEdit(synonym: Synonym) {
    setEditingId(synonym.id);
    setTerm(synonym.term);
    setSynonymInput(synonym.synonyms.join(", "));
    setShowForm(true);
    setMessage("");
  }

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Synonym Manager</h1>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} style={{ marginRight: 4 }} />Add Synonym
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 24 }}>
          <CardContent style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>{editingId ? "Edit Synonym" : "New Synonym"}</h3>
            {message && <div style={{ padding: 8, borderRadius: 4, backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)", fontSize: 13 }}>{message}</div>}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4, color: "var(--text-muted)" }}>Term</label>
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g., AI" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4, color: "var(--text-muted)" }}>Synonyms (comma separated)</label>
              <Input value={synonymInput} onChange={(e) => setSynonymInput(e.target.value)} placeholder="e.g., Artificial Intelligence, Machine Learning" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={handleSave}>{editingId ? "Update" : "Create"}</Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {synonyms.length === 0 ? (
        <Card>
          <CardContent style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
            No synonym groups defined yet. Click "Add Synonym" to create one.
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {synonyms.map((syn) => (
            <Card key={syn.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{syn.term}</span>
                    <Badge variant={syn.isEnabled ? "success" : "secondary"}>{syn.isEnabled ? "Enabled" : "Disabled"}</Badge>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {syn.synonyms.join(", ")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => handleToggle(syn)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: syn.isEnabled ? "var(--success)" : "var(--text-muted)" }} title={syn.isEnabled ? "Disable" : "Enable"}>
                    {syn.isEnabled ? <Check size={16} /> : <X size={16} />}
                  </button>
                  <button onClick={() => startEdit(syn)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "var(--text-muted)" }} title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(syn.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "var(--destructive)" }} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add Search to dashboard navigation**

Modify `apps/dashboard/src/lib/navigation.ts` to add a "Search" nav item under a new "System" group or existing group. Add after the "Marketing" group entry:

```typescript
  {
    title: "Search",
    icon: Search,
    href: "/dashboard/search",
    roles: ["super_admin", "admin"],
  },
```

And add the import: `import { Search } from "lucide-react";` (already imported).

Actually modify the navigation structure to add a "Search" entry. Since there's no clear parent group for search in the existing nav, add it as an item under the existing "Marketing" group or add it as a standalone group. Looking at the existing nav groups: Overview, Content, CRM, Operations, Portal & Proposals, Marketing, System.

Search management fits best under "System" as it's an admin function. Add:

```typescript
  {
    title: "System",
    icon: UserCog,
    href: "/dashboard/users",
    roles: ["super_admin", "admin"],
    children: [
      { title: "Users", href: "/dashboard/users", icon: Users },
      { title: "Search", href: "/dashboard/search", icon: Search },
      { title: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
```

And add `Search` to the imports from lucide-react.

- [ ] **Step 5: Verify typecheck**

```bash
cd apps/dashboard
npx tsc --noEmit 2>&1 | head -50
```

Fix any type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/app/dashboard/search/
git add apps/dashboard/src/app/api/search/stats/route.ts
git add apps/dashboard/src/lib/navigation.ts
git commit -m "feat: dashboard search overview and synonym manager pages"
```

---

### Task 6: Index Synchronization Hooks

**Files:**
- Read and understand existing content API Routes (no direct changes needed — hooks go into existing routes)
- This task documents the integration points so search stays synced

No code changes needed in this task — the sync hooks are architectural. When content is published or updated in Phase 06/10/11 routes, the route handler calls `SearchIndexerService.indexEntity(entityType, entityId)`. When content is deleted or unpublished, it calls `SearchIndexerService.deleteEntity(entityType, entityId)`.

Integration points:
- `pages` → after publish/update in page API route: `indexEntity("page", id)`
- `posts` → after publish/update in post API route: `indexEntity("post", id)`
- `services` → after publish/update in service API route: `indexEntity("service", id)`
- `projects` → after publish/update in project API route: `indexEntity("project", id)`
- `case_studies` → after publish/update: `indexEntity("case_study", id)`
- `faqs` → after create/update: `indexEntity("faq", id)`
- `timeline_events` → after create/update: `indexEntity("timeline_event", id)`
- `ventures` → after publish/update: `indexEntity("venture", id)`
- `products` → after publish/update: `indexEntity("product", id)`
- `releases` → after publish/update: `indexEntity("release", id)`

These hooks are lightweight and async. They should be called after the successful response, not awaited.

- [ ] **Step 1: Commit documentation**

```bash
git add docs/superpowers/plans/2026-06-12-search-system.md
git commit -m "docs: search sync integration points documented in plan"
```

---

### Task 7: Typecheck and Verify

- [ ] **Step 1: Full typecheck across affected packages**

```bash
cd packages/database
npx tsc --noEmit 2>&1
```

```bash
cd apps/dashboard
npx tsc --noEmit 2>&1
```

Fix any type errors.

- [ ] **Step 2: Build test**

```bash
cd packages/database
npx tsc --noEmit 2>&1
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: typecheck fixes for search system"
```

---

### Task 8: Deliverable Reports

**Files:**
- Create: `docs/superpowers/reports/PHASE12_REVIEW.md`
- Create: `docs/superpowers/reports/PHASE12_REPORT.md`
- Create: `docs/superpowers/reports/PHASE12_ACCEPTANCE_REPORT.md`
- Create: `docs/superpowers/reports/PHASE12_CLOSEOUT_REPORT.md`

- [ ] **Step 1: Write PHASE12_REVIEW.md**

```
# Phase 12 — Search System Review

## Overview
PostgreSQL Full Text Search as query engine with search_index aggregation layer.

## Architecture
- search_index table with tsvector generated column + GIN index
- SearchIndexerService for indexing all 10 source types
- FTS queries via ts_rank/ts_headline
- search_analytics table for query tracking

## Files Created/Modified
[list all files from this phase]

## Schema Changes
- search_index: added search_vector (tsvector) + GIN index
- search_synonyms: added is_enabled boolean
- search_analytics: new table for query analysis

## API Endpoints
- GET /api/search — Public FTS search
- POST /api/search/rebuild — Admin full/partial reindex
- GET/POST /api/search/synonyms — List/create synonyms
- PUT/DELETE /api/search/synonyms/[id] — Update/delete synonyms
- GET /api/search/stats — Index + analytics stats

## Dashboard Pages
- /dashboard/search — Search overview with stats, index breakdown, top queries
- /dashboard/search/synonyms — Synonym CRUD manager

## Known Issues
[document any]
```

- [ ] **Step 2: Write PHASE12_REPORT.md**

Detailed report covering implementation decisions, challenges, and technical notes.

- [ ] **Step 3: Write PHASE12_ACCEPTANCE_REPORT.md**

Checklist against requirements:
- [ ] Search returns correct results via FTS
- [ ] Published content only indexed
- [ ] Synonyms work with expansion
- [ ] Reindex works (full and per-type)
- [ ] Filters work (type, pagination)
- [ ] Pagination works
- [ ] Dashboard shows index stats
- [ ] Synonym CRUD works

- [ ] **Step 4: Write PHASE12_CLOSEOUT_REPORT.md**

Summary of phase completion, file inventory, and handoff notes.

- [ ] **Step 5: Commit reports**

```bash
git add docs/superpowers/reports/PHASE12_*.md
git commit -m "docs: phase 12 deliverable reports"
```
