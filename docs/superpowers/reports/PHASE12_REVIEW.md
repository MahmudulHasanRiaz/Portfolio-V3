# Phase 12 — Search System: Implementation Review

## Overview

Phase 12 builds a PostgreSQL Full-Text Search system with a search_index aggregation layer, FTS queries with synonym expansion, application-layer sync hooks, a public search API, admin search management, and analytics tracking.

## Architecture

- **Query Engine:** PostgreSQL FTS (tsvector/tsquery) — no external search services
- **Aggregation Layer:** `search_index` table with generated tsvector column (weighted A/B/C on title/content/summary) + GIN index
- **Synonym Expansion:** `search_synonyms` table with `is_enabled` flag, expanded at query time via OR clauses
- **Analytics:** `search_analytics` table for query logging, popular searches, zero-result tracking
- **Public Search API:** `GET /api/search` — unprotected, paginated, filterable by entity type and locale
- **Admin APIs:** Rebuild (`POST /api/search/rebuild`), synonym CRUD (`/api/search/synonyms`), analytics (`GET /api/search/analytics`)
- **Sync Hooks:** Application-layer fire-and-forget calls to `SearchIndexerService` in CMS content mutation routes
- **Dashboard UI:** Search management page with synonym table + statistics placeholder under System section
- **Portal UI:** Search dialog (Ctrl+K) + dedicated `/search` page with result cards and pagination

## Files Created/Modified

### packages/database/ (8 files)
- `src/schema/search/search-index.ts` — Modified: added entity composite index
- `src/schema/search/search-synonyms.ts` — Modified: added is_enabled column
- `src/schema/search/search-analytics.ts` — Created: search_analytics table
- `src/schema/index.ts` — Modified: added search-analytics export
- `src/types/search.ts` — Created: SearchIndex, SearchResult interfaces
- `src/types/index.ts` — Created: types barrel export
- `src/index.ts` — Modified: added types + SearchIndexerService + SearchIndexRepository exports
- `src/repository/search.ts` — Rewritten: FTS-based searchFTS(), upsertEntity(), deleteEntity(), getEntityCount(), rebuildIndex()
- `src/repository/search-analytics.ts` — Created: logQuery, getPopularQueries, getTotalQueries, getQueriesByEntityType, getZeroResultQueries
- `src/repository/index.ts` — Modified: added SearchAnalyticsRepository export
- `src/services/search-indexer.ts` — Created: SearchIndexerService with indexEntity, deleteEntity, rebuildAll (crawls 10 source entities)
- `src/services/index.ts` — Created: services barrel export
- `drizzle/0002_shocking_xorn.sql` — Created: migration adding tsvector + GIN index, is_enabled, search_analytics

### apps/dashboard/ (8 files)
- `src/app/api/search/route.ts` — Created: public FTS search endpoint
- `src/app/api/search/rebuild/route.ts` — Created: admin rebuild endpoint
- `src/app/api/search/synonyms/route.ts` — Created: synonym list + create
- `src/app/api/search/synonyms/[id]/route.ts` — Created: synonym update + delete
- `src/app/api/search/analytics/route.ts` — Created: analytics data endpoint
- `src/middleware.ts` — Modified: added `/api/search` to public prefixes
- `src/actions/search.ts` — Created: server actions for synonym CRUD
- `src/app/dashboard/system/search/page.tsx` — Created: synonym management UI
- `src/app/dashboard/system/search/statistics/page.tsx` — Created: analytics placeholder
- `src/lib/navigation.ts` — Modified: added Search + Statistics nav entries

### apps/portal/ (3 files)
- `src/app/api/search/route.ts` — Created: search proxy to SearchIndexRepository
- `src/app/search/page.tsx` — Created: search results page with pagination
- `src/components/search-dialog.tsx` — Created: Ctrl+K search overlay with live results

## Source Entities Indexed (10)
pages, posts, services, projects, case_studies, faqs, timeline_events, ventures, products, releases — only published entities (status-based filtering)

## Sync Architecture
- Centralized: ContentService (`packages/cms/`) hooks for 7 entity types
- Per-route: Venture, product, release API routes for 3 entity types
- Fire-and-forget pattern (`.catch()`) — non-blocking
