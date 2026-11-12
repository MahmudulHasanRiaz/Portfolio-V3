# Phase 10 — Artist System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the artist management system for releases, streaming platforms, lyrics, videos, and timeline events with dashboard CRUD.

**Architecture:** Business logic in `packages/artist/` (repository pattern + postgres driver), exposed via Next.js API route handlers in `apps/dashboard/src/app/api/releases/`, and rendered in dashboard pages under `apps/dashboard/src/app/dashboard/releases/`. DB schema extends existing `artist/` tables. Uses the same patterns as Phase 09 (entrepreneur).

**Tech Stack:** TypeScript, postgres driver, Next.js 16 App Router, Drizzle ORM (schema), existing UI components from @repo/ui

---

## File Structure

### packages/database/src/schema/artist/
- `releases.ts` — MODIFY: add `releaseFormat` column
- `release-lyrics.ts` — MODIFY: add `status` column
- `release-videos.ts` — CREATE: new video links table
- `index.ts` — MODIFY: add new export

### packages/artist/src/
- `errors.ts` — error classes
- `types.ts` — types, filters, response shapes
- `release-repository.ts` — ReleaseRepository
- `platform-repository.ts` — PlatformRepository
- `lyrics-repository.ts` — LyricsRepository
- `video-repository.ts` — VideoRepository
- `timeline-repository.ts` — TimelineRepository
- `index.ts` — barrel exports + factory

### apps/dashboard/src/app/api/releases/
- `route.ts` — GET list + POST create
- `[id]/route.ts` — GET + PATCH + DELETE
- `[id]/platforms/route.ts` — GET list + POST create
- `[id]/platforms/[platformId]/route.ts` — PATCH + DELETE
- `[id]/lyrics/route.ts` — GET + PUT (upsert)
- `[id]/videos/route.ts` — GET list + POST + DELETE
- `[id]/timeline/route.ts` — GET + POST

### apps/dashboard/src/app/dashboard/releases/
- `page.tsx` — list page
- `new/page.tsx` — create form
- `[id]/page.tsx` — detail page
- `components/release-profile.tsx` — profile edit tab
- `components/release-platforms.tsx` — platform links tab
- `components/release-lyrics.tsx` — lyrics tab
- `components/release-videos.tsx` — videos tab
- `components/release-timeline.tsx` — timeline tab

---

### Task 1: Database Schema — Add columns + release_videos table

**Files:**
- Modify: `packages/database/src/schema/artist/releases.ts`
- Modify: `packages/database/src/schema/artist/release-lyrics.ts`
- Create: `packages/database/src/schema/artist/release-videos.ts`
- Modify: `packages/database/src/schema/artist/index.ts`
- Verify: `packages/database/src/schema/index.ts`

- [ ] **Step 1: Add releaseFormat to releases.ts**

```typescript
// Add after `type` column:
  releaseFormat: varchar("release_format", { length: 50 }),
```

- [ ] **Step 2: Add status to release-lyrics.ts**

```typescript
// Add after `translations` column:
  status: varchar("status", { length: 20 }).default("draft"),
```

- [ ] **Step 3: Create release-videos.ts**

```typescript
import { pgTable, uuid, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const releaseVideos = pgTable("release_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id"),
  platformName: varchar("platform_name", { length: 100 }),
  videoUrl: text("video_url"),
  title: text("title"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```

- [ ] **Step 4: Update artist/index.ts exports**

```typescript
export * from "./releases";
export * from "./release-platforms";
export * from "./release-lyrics";
export * from "./release-videos";
```

- [ ] **Step 5: Verify schema/index.ts already exports artist tables**

Check: `packages/database/src/schema/index.ts` already includes `export * from "./artist";`

Also verify: `enums.ts` already has `releaseType` with correct values (nasheed, tilawat, acting, podcast, interview, documentary).

---

### Task 2: Artist Package — Package config + errors + types

**Files:**
- Create: `packages/artist/package.json`
- Create: `packages/artist/tsconfig.json`
- Create: `packages/artist/src/errors.ts`
- Create: `packages/artist/src/types.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@repo/artist",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "*",
    "@repo/eslint-config": "*",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create src/errors.ts**

```typescript
export class ArtistError extends Error {
  constructor(message: string, public code: string = "ARTIST_ERROR") {
    super(message);
    this.name = "ArtistError";
  }
}

export class ReleaseNotFoundError extends ArtistError {
  constructor(id: string) {
    super(`Release not found: ${id}`, "RELEASE_NOT_FOUND");
  }
}
```

- [ ] **Step 4: Create src/types.ts**

```typescript
export interface ReleaseRow {
  id: string;
  title: string | null;
  slug: string;
  type: string | null;
  releaseFormat: string | null;
  coverImage: string | null;
  description: string | null;
  releaseDate: string | null;
  isFeatured: boolean | null;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  keywords: string | null;
  lyrics: string | null;
  credits: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ReleasePlatformRow {
  id: string;
  releaseId: string | null;
  platformName: string | null;
  platformUrl: string | null;
}

export interface ReleaseLyricsRow {
  id: string;
  releaseId: string | null;
  lyricsText: string | null;
  lyricsLanguage: string | null;
  translations: Record<string, unknown> | null;
  status: string | null;
}

export interface VideoRow {
  id: string;
  releaseId: string | null;
  platformName: string | null;
  videoUrl: string | null;
  title: string | null;
  sortOrder: number | null;
  createdAt: string | null;
}

export interface ReleaseFilters {
  search?: string;
  status?: string;
  type?: string;
  format?: string;
  page?: number;
  pageSize?: number;
}

export interface ReleaseListResponse {
  releases: ReleaseRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

---

### Task 3: Artist Package — ReleaseRepository

**Files:**
- Create: `packages/artist/src/release-repository.ts`

```typescript
import postgres from "postgres";
import type { ReleaseFilters, ReleaseRow, ReleaseListResponse } from "./types";

type Sql = postgres.Sql<{}>;

export class ReleaseRepository {
  constructor(private sql: Sql) {}

  async list(filters: ReleaseFilters = {}): Promise<ReleaseListResponse> {
    const { search, status, type, format, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (search) {
      conditions.push(`(title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (type) {
      conditions.push(`type = $${params.length + 1}`);
      params.push(type);
    }
    if (format) {
      conditions.push(`release_format = $${params.length + 1}`);
      params.push(format);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM releases ${where}`, params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<ReleaseRow[]>(
      `SELECT * FROM releases ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { releases: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<ReleaseRow | null> {
    const rows = await this.sql.unsafe<ReleaseRow[]>("SELECT * FROM releases WHERE id = $1::uuid", [id]);
    return rows[0] ?? null;
  }

  async getBySlug(slug: string): Promise<ReleaseRow | null> {
    const rows = await this.sql.unsafe<ReleaseRow[]>("SELECT * FROM releases WHERE slug = $1", [slug]);
    return rows[0] ?? null;
  }

  async create(data: Record<string, unknown>): Promise<ReleaseRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const now = new Date().toISOString();
    const cols: string[] = ["id", "created_at", "updated_at"];
    const vals: postgres.ParameterOrJSON<never>[] = [id, now, now];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || key === "id" || key === "createdAt" || key === "updatedAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      cols.push(dbCol);
      vals.push(value as any);
    }

    const ph = cols.map((_, i) => `$${i + 1}`);
    const rows = await this.sql.unsafe<ReleaseRow[]>(
      `INSERT INTO releases (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING *`,
      vals
    );
    return rows[0]!;
  }

  async update(id: string, data: Record<string, unknown>): Promise<ReleaseRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      sets.push(`${dbCol} = $${vals.length + 1}`);
      vals.push(value as any);
    }

    if (sets.length === 0) return this.getById(id);
    sets.push("updated_at = NOW()");
    vals.push(id);

    const rows = await this.sql.unsafe<ReleaseRow[]>(
      `UPDATE releases SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM releases WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }
}
```

---

### Task 4: Artist Package — Platform, Lyrics, Video, Timeline repositories + factory

**Files:**
- Create: `packages/artist/src/platform-repository.ts`
- Create: `packages/artist/src/lyrics-repository.ts`
- Create: `packages/artist/src/video-repository.ts`
- Create: `packages/artist/src/timeline-repository.ts`
- Create: `packages/artist/src/index.ts`

- [ ] **Step 1: Create platform-repository.ts**

```typescript
import postgres from "postgres";
import type { ReleasePlatformRow } from "./types";

type Sql = postgres.Sql<{}>;

export class PlatformRepository {
  constructor(private sql: Sql) {}

  async list(releaseId: string): Promise<ReleasePlatformRow[]> {
    return this.sql.unsafe<ReleasePlatformRow[]>(
      "SELECT * FROM release_platforms WHERE release_id = $1::uuid ORDER BY platform_name", [releaseId]
    );
  }

  async create(releaseId: string, platformName: string, platformUrl: string): Promise<ReleasePlatformRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<ReleasePlatformRow[]>(
      "INSERT INTO release_platforms (id, release_id, platform_name, platform_url) VALUES ($1::uuid, $2::uuid, $3, $4) RETURNING *",
      [id, releaseId, platformName, platformUrl]
    );
    return rows[0]!;
  }

  async update(id: string, data: { platformName?: string; platformUrl?: string }): Promise<ReleasePlatformRow | null> {
    const sets: string[] = [];
    const vals: (string | undefined)[] = [];
    if (data.platformName !== undefined) {
      sets.push(`platform_name = $${vals.length + 1}`);
      vals.push(data.platformName);
    }
    if (data.platformUrl !== undefined) {
      sets.push(`platform_url = $${vals.length + 1}`);
      vals.push(data.platformUrl);
    }
    if (sets.length === 0) return null;
    vals.push(id);
    const rows = await this.sql.unsafe<ReleasePlatformRow[]>(
      `UPDATE release_platforms SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM release_platforms WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }
}
```

- [ ] **Step 2: Create lyrics-repository.ts**

```typescript
import postgres from "postgres";
import type { ReleaseLyricsRow } from "./types";

type Sql = postgres.Sql<{}>;

export class LyricsRepository {
  constructor(private sql: Sql) {}

  async getByReleaseId(releaseId: string): Promise<ReleaseLyricsRow | null> {
    const rows = await this.sql.unsafe<ReleaseLyricsRow[]>(
      "SELECT * FROM release_lyrics WHERE release_id = $1::uuid", [releaseId]
    );
    return rows[0] ?? null;
  }

  async upsert(releaseId: string, data: { lyricsText?: string; lyricsLanguage?: string; translations?: Record<string, unknown>; status?: string }): Promise<ReleaseLyricsRow> {
    const existing = await this.getByReleaseId(releaseId);
    if (existing) {
      const sets: string[] = [];
      const vals: (string | undefined | Record<string, unknown>)[] = [];
      if (data.lyricsText !== undefined) { sets.push(`lyrics_text = $${vals.length + 1}`); vals.push(data.lyricsText); }
      if (data.lyricsLanguage !== undefined) { sets.push(`lyrics_language = $${vals.length + 1}`); vals.push(data.lyricsLanguage); }
      if (data.translations !== undefined) { sets.push(`translations = $${vals.length + 1}`); vals.push(data.translations as any); }
      if (data.status !== undefined) { sets.push(`status = $${vals.length + 1}`); vals.push(data.status); }
      if (sets.length === 0) return existing;
      vals.push(existing.id);
      const rows = await this.sql.unsafe<ReleaseLyricsRow[]>(
        `UPDATE release_lyrics SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      return rows[0]!;
    } else {
      const { randomUUID } = await import("node:crypto");
      const id = randomUUID();
      const rows = await this.sql.unsafe<ReleaseLyricsRow[]>(
        "INSERT INTO release_lyrics (id, release_id, lyrics_text, lyrics_language, translations, status) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6) RETURNING *",
        [id, releaseId, data.lyricsText ?? null, data.lyricsLanguage ?? null, (data.translations ?? null) as any, data.status ?? "draft"]
      );
      return rows[0]!;
    }
  }
}
```

- [ ] **Step 3: Create video-repository.ts**

```typescript
import postgres from "postgres";
import type { VideoRow } from "./types";

type Sql = postgres.Sql<{}>;

export class VideoRepository {
  constructor(private sql: Sql) {}

  async list(releaseId: string): Promise<VideoRow[]> {
    return this.sql.unsafe<VideoRow[]>(
      "SELECT * FROM release_videos WHERE release_id = $1::uuid ORDER BY sort_order ASC NULLS LAST, created_at DESC",
      [releaseId]
    );
  }

  async create(releaseId: string, data: { platformName: string; videoUrl: string; title?: string; sortOrder?: number }): Promise<VideoRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<VideoRow[]>(
      "INSERT INTO release_videos (id, release_id, platform_name, video_url, title, sort_order) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6) RETURNING *",
      [id, releaseId, data.platformName, data.videoUrl, data.title ?? null, data.sortOrder ?? null]
    );
    return rows[0]!;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM release_videos WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }
}
```

- [ ] **Step 4: Create timeline-repository.ts**

```typescript
import postgres from "postgres";

type Sql = postgres.Sql<{}>;

interface TimelineEvent {
  id: string;
  sourceType: string | null;
  sourceId: string | null;
  eventType: string | null;
  title: string | null;
  description: string | null;
  eventDate: string | null;
  icon: string | null;
  url: string | null;
  sortOrder: number | null;
  createdAt: string | null;
}

export class TimelineRepository {
  constructor(private sql: Sql) {}

  async getByReleaseId(releaseId: string): Promise<TimelineEvent[]> {
    return this.sql.unsafe<TimelineEvent[]>(
      "SELECT * FROM timeline_events WHERE source_type = 'release' AND source_id = $1::uuid ORDER BY event_date DESC NULLS LAST, created_at DESC",
      [releaseId]
    );
  }

  async addEvent(releaseId: string, data: { eventType: string; title: string; description?: string; eventDate?: string; icon?: string; url?: string }): Promise<TimelineEvent> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<TimelineEvent[]>(
      "INSERT INTO timeline_events (id, source_type, source_id, event_type, title, description, event_date, icon, url) VALUES ($1::uuid, 'release', $2::uuid, $3, $4, $5, $6, $7, $8) RETURNING *",
      [id, releaseId, data.eventType, data.title, data.description ?? null, data.eventDate ?? null, data.icon ?? null, data.url ?? null]
    );
    return rows[0]!;
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM timeline_events WHERE id = $1::uuid RETURNING id", [eventId]
    );
    return result.length > 0;
  }
}
```

- [ ] **Step 5: Create index.ts (factory)**

```typescript
import postgres from "postgres";
import { ReleaseRepository } from "./release-repository";
import { PlatformRepository } from "./platform-repository";
import { LyricsRepository } from "./lyrics-repository";
import { VideoRepository } from "./video-repository";
import { TimelineRepository } from "./timeline-repository";

export { ReleaseRepository } from "./release-repository";
export { PlatformRepository } from "./platform-repository";
export { LyricsRepository } from "./lyrics-repository";
export { VideoRepository } from "./video-repository";
export { TimelineRepository } from "./timeline-repository";
export * from "./errors";
export * from "./types";

export function createArtistRepositories(connectionString: string) {
  const sql = postgres(connectionString, { max: 10 });
  return {
    releases: new ReleaseRepository(sql),
    platforms: new PlatformRepository(sql),
    lyrics: new LyricsRepository(sql),
    videos: new VideoRepository(sql),
    timeline: new TimelineRepository(sql),
    close: () => sql.end(),
  };
}
```

---

### Task 5: Artist Package — Typecheck + add dashboard dependency

**Files:**
- Verify: `packages/artist/tsconfig.json` compiles
- Modify: `apps/dashboard/package.json` — add `@repo/artist` dependency

- [ ] **Step 1: Typecheck artist package**

Run: `cd G:\Portfolio-V2\packages\artist && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Add @repo/artist to dashboard's package.json**

Add `"@repo/artist": "*"` to `apps/dashboard/package.json` dependencies.

- [ ] **Step 3: Install new dependency**

Run: `cd G:\Portfolio-V2 && npm install`
Expected: `@repo/artist` symlinked into node_modules

---

### Task 6: API Routes — Releases list + create, detail + update + delete

**Files:**
- Create: `apps/dashboard/src/app/api/releases/route.ts`
- Create: `apps/dashboard/src/app/api/releases/[id]/route.ts`

- [ ] **Step 1: Create releases/route.ts (list + create)**

```typescript
import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createArtistRepositories } from "@repo/artist";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const format = searchParams.get("format");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const { releases } = createArtistRepositories(dbUrl);
    const result = await releases.list({
      search: search ?? undefined,
      status: status ?? undefined,
      type: type ?? undefined,
      format: format ?? undefined,
      page,
      pageSize,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch releases" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { releases } = createArtistRepositories(dbUrl);
    const release = await releases.create({ ...body, createdBy: session.user.id });
    return NextResponse.json(release, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create release" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Create releases/[id]/route.ts (get + update + delete)**

```typescript
import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createArtistRepositories } from "@repo/artist";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { releases } = createArtistRepositories(dbUrl);
    const release = await releases.getById(id);
    if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });
    return NextResponse.json(release);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch release" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { releases } = createArtistRepositories(dbUrl);
    const release = await releases.update(id, body);
    if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });
    return NextResponse.json(release);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update release" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { releases } = createArtistRepositories(dbUrl);
    const deleted = await releases.delete(id);
    if (!deleted) return NextResponse.json({ error: "Release not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete release" },
      { status: 500 },
    );
  }
}
```

---

### Task 7: API Routes — Platforms, Lyrics, Videos, Timeline sub-routes

**Files:**
- Create: `apps/dashboard/src/app/api/releases/[id]/platforms/route.ts`
- Create: `apps/dashboard/src/app/api/releases/[id]/platforms/[platformId]/route.ts`
- Create: `apps/dashboard/src/app/api/releases/[id]/lyrics/route.ts`
- Create: `apps/dashboard/src/app/api/releases/[id]/videos/route.ts`
- Create: `apps/dashboard/src/app/api/releases/[id]/timeline/route.ts`

All routes follow the same auth + error pattern as Task 6.

- [ ] **Step 1: Create platforms/route.ts** — GET (list by releaseId), POST (create platform link)

- [ ] **Step 2: Create platforms/[platformId]/route.ts** — PATCH, DELETE

- [ ] **Step 3: Create lyrics/route.ts** — GET (get by releaseId), PUT (upsert)

- [ ] **Step 4: Create videos/route.ts** — GET (list by releaseId), POST (create), DELETE

- [ ] **Step 5: Create timeline/route.ts** — GET (list by releaseId), POST (add event)

---

### Task 8: Dashboard — Releases list page

**Files:**
- Create: `apps/dashboard/src/app/dashboard/releases/page.tsx`

Client component with:
- Search input, status/type/format filter selects
- Card-based release list with cover image thumbnail, badges, edit button
- Pagination
- Empty state, loading state

---

### Task 9: Dashboard — Release create page

**Files:**
- Create: `apps/dashboard/src/app/dashboard/releases/new/page.tsx`

Client component with form:
- Title, slug (auto from title), type select, format select, description, releaseDate
- POST to /api/releases, redirects to [id] on success

---

### Task 10: Dashboard — Release detail page + 5 sub-components

**Files:**
- Create: `apps/dashboard/src/app/dashboard/releases/[id]/page.tsx` — tabbed container
- Create: `apps/dashboard/src/app/dashboard/releases/components/release-profile.tsx` — Profile tab
- Create: `apps/dashboard/src/app/dashboard/releases/components/release-platforms.tsx` — Platforms tab
- Create: `apps/dashboard/src/app/dashboard/releases/components/release-lyrics.tsx` — Lyrics tab
- Create: `apps/dashboard/src/app/dashboard/releases/components/release-videos.tsx` — Videos tab
- Create: `apps/dashboard/src/app/dashboard/releases/components/release-timeline.tsx` — Timeline tab

- [ ] **Step 1: Create [id]/page.tsx** — tabs container

- [ ] **Step 2: Create release-profile.tsx** — Edit title, slug, type, format, coverImage, description, releaseDate, credits, SEO

- [ ] **Step 3: Create release-platforms.tsx** — List/add/edit/delete platform links per release

- [ ] **Step 4: Create release-lyrics.tsx** — Textarea for lyrics, language selector, publish/draft toggle

- [ ] **Step 5: Create release-videos.tsx** — List/add/delete video links with platform selector

- [ ] **Step 6: Create release-timeline.tsx** — List/add/delete timeline events

---

### Task 11: Verification + Deliverables

**Files:**
- Create: `docs/superpowers/reports/PHASE10_REVIEW.md`
- Create: `docs/superpowers/reports/PHASE10_REPORT.md`
- Create: `docs/superpowers/reports/PHASE10_ACCEPTANCE_REPORT.md`
- Create: `docs/superpowers/reports/PHASE10_CLOSEOUT_REPORT.md`

- [ ] **Step 1: Typecheck the entire project**

Run: `cd G:\Portfolio-V2\packages\artist && npx tsc --noEmit`
Expected: No errors

Run: `cd G:\Portfolio-V2\apps\dashboard && npx tsc --noEmit 2>&1 | findstr /i artist`
Expected: No artist-related errors (pre-existing errors tolerated)

- [ ] **Step 2: Test the dev server loads the releases page**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/releases
```
Expected: 307 (redirect to login)

- [ ] **Step 3: Generate Phase 10 deliverables**

Create review, report, acceptance, and closeout documents.

- [ ] **Step 4: STOP**

Phase 10 is complete. Do not begin Phase 11.
