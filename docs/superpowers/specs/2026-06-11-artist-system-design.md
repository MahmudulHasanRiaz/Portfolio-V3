# Phase 10 — Artist System Design

## Overview
Artist management system centered on Releases. A Release is the root entity — platforms, lyrics, videos, and timeline events attach to it. Press kit is an artist-level concern, not release-level.

## Architecture
- Business logic in `packages/artist/` (postgres driver, repository pattern)
- API routes under `apps/dashboard/src/app/api/releases/`
- Dashboard pages under `apps/dashboard/src/app/dashboard/releases/`
- DB schema extends existing `artist/` tables
- Matches Phase 09 pattern exactly

## Database Schema

### Existing — Keep as-is

**`releases`** (existing table, no deletions):
- id, title, slug, type (releaseType enum), coverImage, description, releaseDate, isFeatured, status (contentStatus), metaTitle, metaDescription, ogImage, canonicalUrl, keywords, lyrics, credits, createdBy, createdAt, updatedAt

**`release_platforms`** (existing, no changes):
- id, releaseId, platformName, platformUrl

### Existing — Modify

**`releases`** — Add column:
- `releaseFormat` — varchar, optional: single, ep, album (not an enum — flexible)

**`release_lyrics`** — Add column:
- `status` — varchar, default 'draft': draft, published (publication control)

### New

**`release_videos`**:
- id (uuid PK)
- releaseId (uuid FK → releases)
- platformName (varchar) — youtube, facebook, tiktok, other
- videoUrl (text)
- title (text, optional)
- sortOrder (integer)
- createdAt (timestamp)

### Artist Profiles (Reuse — no change)
- `person_profiles`: bioShort, bioLong, profileImage, coverImage, pressKitUrl, socialLinks, streamingLinks
- `artist_profiles`: artistName, biography, genre, bookingInfo
- Press kit assets reference Media system (Phase 07). No new press kit table.

### Timeline (Reuse — no change)
- `timeline_events` with sourceType='release', sourceId=releaseId

## Package Structure: `packages/artist/`

### `src/errors.ts`
- `ArtistError`, `ReleaseNotFoundError`

### `src/types.ts`
- `ReleaseRow` — maps all release columns
- `ReleasePlatformRow` — id, releaseId, platformName, platformUrl
- `ReleaseLyricsRow` — id, releaseId, lyricsText, lyricsLanguage, translations, status
- `VideoRow` — id, releaseId, platformName, videoUrl, title, sortOrder
- `ReleaseFilters` — search, status, type, format, page, pageSize
- `ReleaseListResponse` — releases, total, page, pageSize, totalPages

### `src/release-repository.ts`
- `list(filters)` — search/status/type/format/pagination, SQL with dynamic WHERE
- `getById(id)` — single release
- `getBySlug(slug)` — single release
- `create(data)` — auto UUID, timestamps, camelCase→snake_case mapping
- `update(id, data)` — dynamic SET clauses
- `delete(id)` — DELETE RETURNING id

### `src/platform-repository.ts`
- `list(releaseId)` — all platform links for a release
- `create(releaseId, platformName, platformUrl)` — add link
- `update(id, data)` — update platform link
- `delete(id)` — remove platform link

### `src/lyrics-repository.ts`
- `getByReleaseId(releaseId)` — get lyrics (single, one-to-one)
- `upsert(releaseId, data)` — INSERT ON CONFLICT (releaseId) DO UPDATE

### `src/video-repository.ts`
- `list(releaseId)` — all videos for a release
- `create(releaseId, data)` — add video
- `delete(id)` — remove video

### `src/timeline-repository.ts`
- `getByReleaseId(releaseId)` — WHERE sourceType='release'
- `addEvent(releaseId, data)` — INSERT into timeline_events
- `deleteEvent(eventId)` — DELETE

### `src/index.ts`
- `createArtistRepositories(connectionString)` — factory returning all repos + close()

## API Routes

All routes follow CRM/Phase 09 pattern: auth check via `auth.api.getSession`, try/catch with 500, `force-dynamic`.

| Route | Methods |
|-------|---------|
| `api/releases/route.ts` | GET (list), POST (create) |
| `api/releases/[id]/route.ts` | GET, PATCH, DELETE |
| `api/releases/[id]/platforms/route.ts` | GET (list), POST (create) |
| `api/releases/[id]/platforms/[platformId]/route.ts` | PATCH, DELETE |
| `api/releases/[id]/lyrics/route.ts` | GET, PUT (upsert) |
| `api/releases/[id]/videos/route.ts` | GET, POST, DELETE |
| `api/releases/[id]/timeline/route.ts` | GET, POST |

## Dashboard Pages

### `dashboard/releases/page.tsx` — List Page
Client component. Search input + status/type/format filters. Card-based list with coverImage thumbnail, badges. Pagination. "New Release" button.

### `dashboard/releases/new/page.tsx` — Create Page
Client component. Form: title, slug (auto from title), type, format, description, releaseDate. POST to /api/releases. Redirects to edit page on success.

### `dashboard/releases/[id]/page.tsx` — Detail Page
Client component. 5 tabs:

1. **Profile** — Edit title, slug, type, format, coverImage, description, releaseDate, credits (JSON), isFeatured, SEO fields
2. **Platforms** — List/add/edit/delete streaming platform links. Inline form with platform name select + URL input.
3. **Lyrics** — Textarea for lyrics, language selector, translations JSON editor, publish/draft toggle.
4. **Videos** — List/add/delete external video links. Inline form with platform select + URL + title.
5. **Timeline** — List/add/delete timeline events. Reuse timeline_events with sourceType='release'.

No Press Kit tab (artist-level concern, not release-level).

## Verification
- All packages typecheck with zero new errors
- Dev server loads /dashboard/releases (307 redirect → login)
- API routes respond
- All 4 deliverables: PHASE10_REVIEW.md, PHASE10_REPORT.md, PHASE10_ACCEPTANCE_REPORT.md, PHASE10_CLOSEOUT_REPORT.md

## Stop Rule
Phase 10 complete → STOP. Do not begin Phase 11.
