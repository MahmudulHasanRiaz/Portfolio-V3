# Phase 12 — Search System Design

## Overview

PostgreSQL Full Text Search (FTS) as the query engine with `search_index` as the aggregation layer. No external search engines (Elasticsearch, Meilisearch, Algolia, Typesense).

## Implementation Order

1. Search Index Engine
2. Index Synchronization
3. PostgreSQL FTS Queries
4. Search API
5. Dashboard Search Management
6. Search Analytics Foundation

---

## Architecture

```
Content Tables (pages, posts, ...)
        │
        ▼ (Indexing Service — on publish/update)
  search_index (tsvector column via generated column)
        │
        ▼ (FTS Query — to_tsvector / plainto_tsquery)
  Search API (GET /api/search)
        │
        ▼
  Consumed by: Dashboard search, Public search page
```

## Schema Changes

### search_index — Add tsvector generated column

```sql
ALTER TABLE search_index ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'C')
  ) STORED;

CREATE INDEX idx_search_index_fts ON search_index USING GIN(search_vector);
CREATE INDEX idx_search_index_status ON search_index (published_at);
```

### search_synonyms — Add is_enabled

```sql
ALTER TABLE search_synonyms ADD COLUMN is_enabled boolean NOT NULL DEFAULT true;
```

## Search Sources

Only entities marked as published are indexed:

| Source | Table | Published Check | Fields Indexed |
|--------|-------|-----------------|----------------|
| Pages | `pages` | `status = 'published'` | title, content |
| Blog Posts | `posts` | `status = 'published'` | title, content, excerpt |
| Services | `services` | `status = 'published'` | title, description |
| Projects | `projects` | `status = 'published'` | title, description |
| Case Studies | `case_studies` | `status = 'published'` | title, challenge, research, strategy, results |
| FAQs | `faqs` | always (no status) | question, answer |
| Timeline Events | `timeline_events` | always (no status) | title, description |
| Ventures | `ventures` | `content_status = 'published'` | name, description |
| Products | `products` | `content_status = 'published'` | name, description |
| Releases | `releases` | `status = 'published'` | title, description |

## Search Index Engine

### search_index Repository

Extends `BaseRepository` with:

- `findByEntity(entityType, entityId)` — find existing index row (for upsert)
- `upsert(data)` — insert or update by (entity_type, entity_id) unique constraint
- `deleteByEntity(entityType, entityId)` — remove from index
- `searchFTS(query, filters)` — FTS query with pagination (replaces existing ILIKE `search()`)
- `countByEntityType()` — index stats per type
- `getTotalCount()` — total indexed documents

### Indexing Service

`packages/database/src/services/search-indexer.ts`

- `indexEntity(entityType, entityId)` — index a single entity (upsert)
- `removeEntity(entityType, entityId)` — remove from index
- `rebuildIndex()` — full reindex across all sources
- `rebuildIndexForType(entityType)` — reindex a single source type

Each indexing operation:
1. Fetches the published entity from its source table
2. Maps entity fields to search_index columns (title, content, summary, url, thumbnail, publishedAt, contentType)
3. Calls `upsert()` on the search_index repository

### Update/Delete Services

- `updateSearchIndex(entityType, entityId)` — called when content is published/updated
- `deleteSearchIndex(entityType, entityId)` — called when content is unpublished/deleted

### Rebuild Service

- `rebuildSearchIndex()` — truncates search_index, then iterates all source tables in order, inserting only published entities
- `rebuildSearchIndexForType(entityType)` — deletes all rows for that type, then re-indexes

## Index Synchronization

Rather than database triggers (which don't work well with Drizzle), sync happens at the application layer:

- **CMS content**: Hook into the existing content publish/update workflows (Phase 06 API routes). After a successful publish or update, call `updateSearchIndex()`.
- **Entrepreneur content**: Hook into venture/product dashboard API routes. After publish or update, call `updateSearchIndex()`.
- **Artist content**: Hook into release dashboard API routes. After publish or update, call `updateSearchIndex()`.
- **Content deletion/unpublish**: After deletion or unpublish, call `deleteSearchIndex()`.

Initial sync for existing data: `POST /api/search/rebuild` (admin-only).

## PostgreSQL FTS Queries

The `searchFTS()` method in `SearchIndexRepository` builds queries using:

```sql
SELECT *,
  ts_rank(search_vector, plainto_tsquery('english', $query)) AS rank,
  ts_headline('english', content, plainto_tsquery('english', $query),
    'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') AS headline
FROM search_index
WHERE search_vector @@ plainto_tsquery('english', $query)
  AND ($entityType IS NULL OR entity_type = $entityType)
ORDER BY rank DESC
LIMIT $pageSize OFFSET $offset;
```

### Synonym Expansion

Before building the FTS query, expand the search term using `search_synonyms`:

1. Look up the search term in `search_synonyms` where `is_enabled = true`
2. If found, expand into multiple terms: `original_term OR synonym1 OR synonym2`
3. Use `to_tsquery('english', expanded_query)` instead of `plainto_tsquery`

### Filters

| Filter | Type | Behavior |
|--------|------|----------|
| `q` | string | FTS query (required) |
| `type` | string | entity_type filter (optional) |
| `page` | integer | Pagination (default 1) |
| `pageSize` | integer | Items per page (default 20, max 100) |

### Response

```json
{
  "results": [{
    "id": "...",
    "entityType": "page",
    "entityId": "...",
    "title": "...",
    "content": "...",
    "summary": "...",
    "url": "...",
    "thumbnail": "...",
    "publishedAt": "...",
    "contentType": "...",
    "rank": 0.5,
    "headline": "..."
  }],
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

## Search API

### `GET /api/search`

Public endpoint (no auth required). Returns normalized search results.

### `POST /api/search/index`

Admin-only. Index a specific entity.

- Body: `{ entityType, entityId }`

### `POST /api/search/rebuild`

Admin-only. Rebuild entire search index or a specific type.

- Body: `{ entityType? }` (omit for full rebuild)

### `POST /api/search/sync`

Admin-only. Sync synonyms.

- Body: `{ term, synonyms, isEnabled }`

## Dashboard Search Management

### Search Overview (`/dashboard/search`)

- Total indexed documents
- Count per entity type (bar chart or table)
- Most recent indexing activity

### Search Index Status (`/dashboard/search/status`)

- Last rebuild timestamp
- Index freshness per entity type
- Stale index warnings

### Search Rebuild (`/dashboard/search/rebuild`)

- "Rebuild All" button with confirmation
- "Rebuild [Type]" per-entity-type buttons
- Progress indicator
- Completion notification

### Synonym Manager (`/dashboard/search/synonyms`)

- List all synonym groups in a DataTable
- CRUD operations per synonym group
- Enable/disable toggle per group
- Fields: term, synonyms (as tag input), is_enabled

## Search Analytics Foundation

Implemented in the search repository:

- `logSearchQuery(query, filters, resultCount)` — inserts into a new `search_analytics` table
- `getTopQueries(limit, since)` — most common queries in a time period
- `getQueryCount(since)` — total queries in a time period
- `getNoResultQueries(limit)` — queries that returned zero results

### search_analytics Table

```sql
CREATE TABLE search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  entity_type varchar(50),
  result_count int NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
```

Dashboard displays:
- Total search queries (today, this week, this month)
- Top 10 search queries
- Queries with zero results (opportunity for content creation)

## Deliverables

- `docs/superpowers/reports/PHASE12_REVIEW.md`
- `docs/superpowers/reports/PHASE12_REPORT.md`
- `docs/superpowers/reports/PHASE12_ACCEPTANCE_REPORT.md`
- `docs/superpowers/reports/PHASE12_CLOSEOUT_REPORT.md`
