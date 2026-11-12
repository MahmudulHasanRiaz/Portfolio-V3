# Phase 09 — Entrepreneur System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the entrepreneur management system for ventures, products, milestones, and media coverage with dashboard CRUD.

**Architecture:** Business logic in `packages/entrepreneur/` (repository pattern + postgres driver), exposed via Next.js API route handlers in `apps/dashboard/src/app/api/ventures/`, and rendered in dashboard pages under `apps/dashboard/src/app/dashboard/ventures/`. DB schema extends existing `entrepreneur/` tables plus `media_mentions` and `timeline_events`. Uses the same patterns as Phase 08 CRM.

**Tech Stack:** TypeScript, postgres driver, Next.js 16 App Router, Drizzle ORM (migrations), existing UI components from @repo/ui

---

## File Structure

### packages/entrepreneur/src/
- `errors.ts` — error classes
- `types.ts` — types, filters, response shapes
- `venture-repository.ts` — VentureRepository
- `product-repository.ts` — ProductRepository
- `timeline-repository.ts` — TimelineRepository
- `category-repository.ts` — CategoryRepository
- `index.ts` — barrel exports + factory

### packages/database/src/schema/entrepreneur/
- `ventures.ts` — MODIFY: add columns
- `products.ts` — MODIFY: add columns
- `venture-categories.ts` — CREATE: new table
- `venture-category-assignments.ts` — CREATE: new junction table

### packages/database/src/schema/content/
- `media-mentions.ts` — MODIFY: add venture_id

### apps/dashboard/src/app/api/ventures/
- `route.ts` — GET list + POST create
- `[id]/route.ts` — GET + PATCH + DELETE
- `[id]/products/route.ts` — GET + POST
- `[id]/timeline/route.ts` — GET + POST
- `[id]/categories/route.ts` — GET + POST
- `[id]/media/route.ts` — GET
- `categories/route.ts` — GET all + POST create
- `categories/[id]/route.ts` — PATCH + DELETE

### apps/dashboard/src/app/api/products/
- `route.ts` — GET list + POST create
- `[id]/route.ts` — GET + PATCH + DELETE

### apps/dashboard/src/app/dashboard/ventures/
- `page.tsx` — list page
- `new/page.tsx` — create form
- `[id]/page.tsx` — detail page
- `components/venture-table.tsx` — DataTable
- `components/venture-form.tsx` — create/edit form
- `components/venture-detail-profile.tsx` — profile card
- `components/venture-products.tsx` — products sub-list
- `components/venture-timeline.tsx` — timeline events
- `components/venture-media.tsx` — media coverage
- `components/venture-categories.tsx` — category management

---

### Task 1: Database Schema Migrations

**Files:**
- Modify: `packages/database/src/schema/entrepreneur/ventures.ts`
- Modify: `packages/database/src/schema/entrepreneur/products.ts`
- Modify: `packages/database/src/schema/content/media-mentions.ts`
- Create: `packages/database/src/schema/entrepreneur/venture-categories.ts`
- Create: `packages/database/src/schema/entrepreneur/venture-category-assignments.ts`
- Modify: `packages/database/src/schema/entrepreneur/index.ts`

- [ ] **Step 1: Add columns to ventures.ts**

```typescript
// Add to the existing imports:
import { jsonb, integer } from "drizzle-orm/pg-core";

// Add these fields after the existing fields, before metaTitle:
  contentStatus: contentStatus("content_status").default("draft"),
  coverImage: text("cover_image"),
  socialLinks: jsonb("social_links"),
  metrics: jsonb("metrics"),
  teamSize: integer("team_size"),
  industry: text("industry"),
  stage: text("stage"),
  location: text("location"),
```

- [ ] **Step 2: Add columns to products.ts**

```typescript
// Add to imports:
import { jsonb } from "drizzle-orm/pg-core";
import { contentStatus } from "../enums";

// Add these fields after isFeatured:
  contentStatus: contentStatus("content_status").default("draft"),
  media: jsonb("media"),
  highlights: jsonb("highlights"),
```

- [ ] **Step 3: Create venture-categories.ts**

```typescript
import { pgTable, uuid, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const ventureCategories = pgTable("venture_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```

- [ ] **Step 4: Create venture-category-assignments.ts**

```typescript
import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { ventures } from "./ventures";
import { ventureCategories } from "./venture-categories";

export const ventureCategoryAssignments = pgTable("venture_category_assignments", {
  ventureId: uuid("venture_id")
    .notNull()
    .references(() => ventures.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => ventureCategories.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.ventureId, table.categoryId] }),
}));
```

- [ ] **Step 5: Add venture_id to media-mentions.ts**

```typescript
// Add after existing fields, after createdBy:
  ventureId: uuid("venture_id"),
```

- [ ] **Step 6: Update entrepreneur/index.ts exports**

```typescript
export * from "./ventures";
export * from "./products";
export * from "./venture-products";
export * from "./venture-categories";
export * from "./venture-category-assignments";
```

- [ ] **Step 7: Generate and apply migration**

Run: `cd packages/database && npx drizzle-kit generate`
Then: `npx drizzle-kit migrate`
If no drizzle-kit, run the manual SQL migration.

- [ ] **Step 8: Verify schema compiles**

Run: `cd packages/database && npx tsc --noEmit`
Expected: No errors

---

### Task 2: Entrepreneur Package — errors + types

**Files:**
- Create: `packages/entrepreneur/src/errors.ts`
- Create: `packages/entrepreneur/src/types.ts`

- [ ] **Step 1: Create errors.ts**

```typescript
export class EntrepreneurError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "EntrepreneurError";
  }
}

export class VentureNotFoundError extends EntrepreneurError {
  constructor(id: string) {
    super(`Venture not found: ${id}`, "VENTURE_NOT_FOUND");
  }
}

export class ProductNotFoundError extends EntrepreneurError {
  constructor(id: string) {
    super(`Product not found: ${id}`, "PRODUCT_NOT_FOUND");
  }
}
```

- [ ] **Step 2: Create types.ts**

```typescript
export interface VentureRow {
  id: string;
  name: string | null;
  slug: string;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  website: string | null;
  foundedDate: string | null;
  status: string;
  contentStatus: string;
  isFeatured: boolean | null;
  socialLinks: Record<string, string> | null;
  metrics: Record<string, unknown> | null;
  teamSize: number | null;
  industry: string | null;
  stage: string | null;
  location: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  keywords: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProductRow {
  id: string;
  ventureId: string | null;
  name: string | null;
  slug: string;
  description: string | null;
  launchDate: string | null;
  url: string | null;
  status: string;
  contentStatus: string;
  isFeatured: boolean | null;
  media: Record<string, unknown> | null;
  highlights: unknown[] | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface CategoryRow {
  id: string;
  name: string | null;
  slug: string;
  description: string | null;
  createdAt: string | null;
}

export interface VentureFilters {
  search?: string;
  status?: string;
  contentStatus?: string;
  categoryId?: string;
  industry?: string;
  page?: number;
  pageSize?: number;
}

export interface VentureListResponse {
  ventures: VentureRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

- [ ] **Step 3: Verify types compile**

Run: `cd packages/entrepreneur && npx tsc --noEmit`
Expected: Needs package setup first (done in Task 3)

---

### Task 3: Entrepreneur Package — Repositories

**Files:**
- Create: `packages/entrepreneur/src/venture-repository.ts`
- Create: `packages/entrepreneur/src/product-repository.ts`
- Create: `packages/entrepreneur/src/timeline-repository.ts`
- Create: `packages/entrepreneur/src/category-repository.ts`
- Create: `packages/entrepreneur/src/index.ts`
- Create: `packages/entrepreneur/package.json`
- Create: `packages/entrepreneur/tsconfig.json`

- [ ] **Step 1: Create venture-repository.ts**

```typescript
import postgres from "postgres";
import type { VentureFilters, VentureRow, VentureListResponse } from "./types";
import { VentureNotFoundError } from "./errors";

type Sql = postgres.Sql<{}>;

export class VentureRepository {
  constructor(private sql: Sql) {}

  async list(filters: VentureFilters = {}): Promise<VentureListResponse> {
    const { search, status, contentStatus, categoryId, industry, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (search) {
      conditions.push(`(name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    if (status) {
      conditions.push(`v.status = $${params.length + 1}`);
      params.push(status);
    }
    if (contentStatus) {
      conditions.push(`v.content_status = $${params.length + 1}`);
      params.push(contentStatus);
    }
    if (industry) {
      conditions.push(`v.industry = $${params.length + 1}`);
      params.push(industry);
    }

    // Build the FROM clause: join with category_assignments if filtering by category
    let fromClause = "FROM ventures v";
    if (categoryId) {
      conditions.push(`vca.category_id = $${params.length + 1}::uuid`);
      params.push(categoryId);
      fromClause += " JOIN venture_category_assignments vca ON v.id = vca.venture_id";
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total ${fromClause} ${where}`, params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<VentureRow[]>(
      `SELECT v.* ${fromClause} ${where} ORDER BY v.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { ventures: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<VentureRow | null> {
    const rows = await this.sql.unsafe<VentureRow[]>("SELECT * FROM ventures WHERE id = $1::uuid", [id]);
    return rows[0] ?? null;
  }

  async getBySlug(slug: string): Promise<VentureRow | null> {
    const rows = await this.sql.unsafe<VentureRow[]>("SELECT * FROM ventures WHERE slug = $1", [slug]);
    return rows[0] ?? null;
  }

  async create(data: Record<string, unknown>): Promise<VentureRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const now = new Date().toISOString();
    const cols: string[] = ["id", "created_at", "updated_at"];
    const vals: postgres.ParameterOrJSON<never>[] = [id, now, now];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || key === "id" || key === "createdAt" || key === "updatedAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      cols.push(dbCol);
      vals.push(typeof value === "object" && !Array.isArray(value) ? JSON.stringify(value) : value as any);
    }

    const ph = cols.map((_, i) => `$${i + 1}`);
    const rows = await this.sql.unsafe<VentureRow[]>(
      `INSERT INTO ventures (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING *`,
      vals
    );
    return rows[0]!;
  }

  async update(id: string, data: Record<string, unknown>): Promise<VentureRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      sets.push(`${dbCol} = $${vals.length + 1}`);
      vals.push(typeof value === "object" && !Array.isArray(value) ? JSON.stringify(value) : value as any);
    }

    if (sets.length === 0) return this.getById(id);
    sets.push("updated_at = NOW()");
    vals.push(id);

    const rows = await this.sql.unsafe<VentureRow[]>(
      `UPDATE ventures SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM ventures WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }

  async getCategories(ventureId: string): Promise<{ id: string; name: string | null; slug: string }[]> {
    return this.sql.unsafe<{ id: string; name: string | null; slug: string }[]>(
      `SELECT vc.id, vc.name, vc.slug FROM venture_category_assignments vca
       JOIN venture_categories vc ON vc.id = vca.category_id
       WHERE vca.venture_id = $1::uuid ORDER BY vc.name`,
      [ventureId]
    );
  }

  async setCategories(ventureId: string, categoryIds: string[]): Promise<void> {
    await this.sql.begin(async (sql) => {
      await sql.unsafe("DELETE FROM venture_category_assignments WHERE venture_id = $1::uuid", [ventureId]);
      for (const catId of categoryIds) {
        await sql.unsafe(
          "INSERT INTO venture_category_assignments (venture_id, category_id) VALUES ($1::uuid, $2::uuid)",
          [ventureId, catId]
        );
      }
    });
  }
}
```

- [ ] **Step 2: Create product-repository.ts**

```typescript
import postgres from "postgres";
import type { ProductRow } from "./types";
import { ProductNotFoundError } from "./errors";

type Sql = postgres.Sql<{}>;

export class ProductRepository {
  constructor(private sql: Sql) {}

  async list(filters: { ventureId?: string; page?: number; pageSize?: number } = {}): Promise<{ products: ProductRow[]; total: number }> {
    const { ventureId, page = 1, pageSize = 50 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (ventureId) {
      conditions.push(`venture_id = $${params.length + 1}::uuid`);
      params.push(ventureId);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM products ${where}`, params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<ProductRow[]>(
      `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { products: rows, total };
  }

  async getById(id: string): Promise<ProductRow | null> {
    const rows = await this.sql.unsafe<ProductRow[]>("SELECT * FROM products WHERE id = $1::uuid", [id]);
    return rows[0] ?? null;
  }

  async create(data: Record<string, unknown>): Promise<ProductRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const now = new Date().toISOString();
    const cols: string[] = ["id", "created_at"];
    const vals: postgres.ParameterOrJSON<never>[] = [id, now];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      cols.push(dbCol);
      vals.push(typeof value === "object" ? JSON.stringify(value) : value as any);
    }

    const ph = cols.map((_, i) => `$${i + 1}`);
    const rows = await this.sql.unsafe<ProductRow[]>(
      `INSERT INTO products (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING *`,
      vals
    );
    return rows[0]!;
  }

  async update(id: string, data: Record<string, unknown>): Promise<ProductRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      sets.push(`${dbCol} = $${vals.length + 1}`);
      vals.push(typeof value === "object" ? JSON.stringify(value) : value as any);
    }

    if (sets.length === 0) return this.getById(id);
    vals.push(id);

    const rows = await this.sql.unsafe<ProductRow[]>(
      `UPDATE products SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM products WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }
}
```

- [ ] **Step 3: Create timeline-repository.ts**

```typescript
import postgres from "postgres";

type Sql = postgres.Sql<{}>;

export interface TimelineEventRow {
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

  async getByVentureId(ventureId: string): Promise<TimelineEventRow[]> {
    return this.sql.unsafe<TimelineEventRow[]>(
      "SELECT * FROM timeline_events WHERE source_type = 'venture' AND source_id = $1::uuid ORDER BY event_date DESC NULLS LAST, sort_order ASC",
      [ventureId]
    );
  }

  async addEvent(ventureId: string, data: { eventType: string; title: string; description?: string; eventDate?: string; icon?: string; url?: string }): Promise<TimelineEventRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<TimelineEventRow[]>(
      `INSERT INTO timeline_events (id, source_type, source_id, event_type, title, description, event_date, icon, url)
       VALUES ($1, 'venture', $2::uuid, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, ventureId, data.eventType, data.title, data.description ?? null, data.eventDate ?? null, data.icon ?? null, data.url ?? null]
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

- [ ] **Step 4: Create category-repository.ts**

```typescript
import postgres from "postgres";
import type { CategoryRow } from "./types";

type Sql = postgres.Sql<{}>;

export class CategoryRepository {
  constructor(private sql: Sql) {}

  async list(): Promise<CategoryRow[]> {
    return this.sql.unsafe<CategoryRow[]>("SELECT * FROM venture_categories ORDER BY name ASC");
  }

  async getById(id: string): Promise<CategoryRow | null> {
    const rows = await this.sql.unsafe<CategoryRow[]>("SELECT * FROM venture_categories WHERE id = $1::uuid", [id]);
    return rows[0] ?? null;
  }

  async create(data: { name: string; slug: string; description?: string }): Promise<CategoryRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<CategoryRow[]>(
      "INSERT INTO venture_categories (id, name, slug, description) VALUES ($1::uuid, $2, $3, $4) RETURNING *",
      [id, data.name, data.slug, data.description ?? null]
    );
    return rows[0]!;
  }

  async update(id: string, data: { name?: string; slug?: string; description?: string }): Promise<CategoryRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];

    if (data.name !== undefined) { sets.push(`name = $${vals.length + 1}`); vals.push(data.name); }
    if (data.slug !== undefined) { sets.push(`slug = $${vals.length + 1}`); vals.push(data.slug); }
    if (data.description !== undefined) { sets.push(`description = $${vals.length + 1}`); vals.push(data.description); }

    if (sets.length === 0) return this.getById(id);
    vals.push(id);

    const rows = await this.sql.unsafe<CategoryRow[]>(
      `UPDATE venture_categories SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM venture_categories WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }
}
```

- [ ] **Step 5: Create index.ts**

```typescript
import postgres from "postgres";
import { VentureRepository } from "./venture-repository";
import { ProductRepository } from "./product-repository";
import { TimelineRepository } from "./timeline-repository";
import { CategoryRepository } from "./category-repository";

export { VentureRepository } from "./venture-repository";
export { ProductRepository } from "./product-repository";
export { TimelineRepository } from "./timeline-repository";
export { CategoryRepository } from "./category-repository";
export { VentureNotFoundError, ProductNotFoundError, EntrepreneurError } from "./errors";
export type { VentureRow, ProductRow, CategoryRow, VentureFilters, VentureListResponse } from "./types";
export type { TimelineEventRow } from "./timeline-repository";

export function createEntrepreneurRepositories(connectionString: string) {
  const sql = postgres(connectionString, { max: 10 });
  return {
    ventures: new VentureRepository(sql),
    products: new ProductRepository(sql),
    timeline: new TimelineRepository(sql),
    categories: new CategoryRepository(sql),
  };
}
```

- [ ] **Step 6: Create package.json**

```json
{
  "name": "@repo/entrepreneur",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
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

- [ ] **Step 7: Create tsconfig.json**

```json
{
  "extends": "../../tooling/typescript/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 8: Install dependencies and verify**

Run: `cd G:\Portfolio-V2 && pnpm install`
Run: `cd packages/entrepreneur && npx tsc --noEmit`
Expected: No errors

---

### Task 4: Venture API Routes

**Files:**
- Create: `apps/dashboard/src/app/api/ventures/route.ts`
- Create: `apps/dashboard/src/app/api/ventures/[id]/route.ts`
- Create: `apps/dashboard/src/app/api/ventures/[id]/products/route.ts`
- Create: `apps/dashboard/src/app/api/ventures/[id]/timeline/route.ts`
- Create: `apps/dashboard/src/app/api/ventures/[id]/categories/route.ts`
- Create: `apps/dashboard/src/app/api/ventures/[id]/media/route.ts`
- Create: `apps/dashboard/src/app/api/ventures/categories/route.ts`
- Create: `apps/dashboard/src/app/api/ventures/categories/[id]/route.ts`

- [ ] **Step 1: Create ventures list + create route**

`apps/dashboard/src/app/api/ventures/route.ts`:
```typescript
import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const { ventures } = createEntrepreneurRepositories(dbUrl);
    const result = await ventures.list({
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      contentStatus: searchParams.get("contentStatus") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      industry: searchParams.get("industry") ?? undefined,
      page: parseInt(searchParams.get("page") ?? "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") ?? "20", 10),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch ventures" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { ventures } = createEntrepreneurRepositories(dbUrl);
    const venture = await ventures.create({ ...body, createdBy: session.user.id });
    return NextResponse.json(venture, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create venture" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Create venture detail + update + delete route**

`apps/dashboard/src/app/api/ventures/[id]/route.ts`:
```typescript
import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { ventures, products, timeline, categories } = createEntrepreneurRepositories(dbUrl);
    const venture = await ventures.getById(id);
    if (!venture) return NextResponse.json({ error: "Venture not found" }, { status: 404 });

    const [productList, timelineEvents, categoryList] = await Promise.all([
      products.list({ ventureId: id }),
      timeline.getByVentureId(id),
      ventures.getCategories(id),
    ]);

    return NextResponse.json({ ...venture, products: productList.products, timeline: timelineEvents, categories: categoryList });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch venture" },
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
    const { ventures } = createEntrepreneurRepositories(dbUrl);
    const venture = await ventures.update(id, body);
    if (!venture) return NextResponse.json({ error: "Venture not found" }, { status: 404 });
    return NextResponse.json(venture);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update venture" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { ventures } = createEntrepreneurRepositories(dbUrl);
    const deleted = await ventures.delete(id);
    if (!deleted) return NextResponse.json({ error: "Venture not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete venture" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Create venture products sub-route**

`apps/dashboard/src/app/api/ventures/[id]/products/route.ts`:
```typescript
import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { products } = createEntrepreneurRepositories(dbUrl);
    const result = await products.list({ ventureId: id });
    return NextResponse.json(result.products);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch products" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Create venture timeline sub-route**

`apps/dashboard/src/app/api/ventures/[id]/timeline/route.ts`:
```typescript
import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { timeline } = createEntrepreneurRepositories(dbUrl);
    const events = await timeline.getByVentureId(id);
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch timeline" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { timeline } = createEntrepreneurRepositories(dbUrl);
    const event = await timeline.addEvent(id, body);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add timeline event" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 5: Create venture categories sub-route**

`apps/dashboard/src/app/api/ventures/[id]/categories/route.ts`:
```typescript
import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { ventures } = createEntrepreneurRepositories(dbUrl);
    const cats = await ventures.getCategories(id);
    return NextResponse.json(cats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { categoryIds } = await request.json();
    const { ventures } = createEntrepreneurRepositories(dbUrl);
    await ventures.setCategories(id, categoryIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set categories" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 6: Create venture media sub-route**

`apps/dashboard/src/app/api/ventures/[id]/media/route.ts`:
```typescript
import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const postgres = (await import("postgres")).default;
    const sql = postgres(dbUrl, { max: 1 });
    try {
      const rows = await sql.unsafe<any[]>(
        "SELECT * FROM media_mentions WHERE venture_id = $1::uuid ORDER BY published_date DESC NULLS LAST",
        [id]
      );
      return NextResponse.json(rows);
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch media" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 7: Create venture categories global routes**

`apps/dashboard/src/app/api/ventures/categories/route.ts`:
```typescript
import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { categories } = createEntrepreneurRepositories(dbUrl);
    const result = await categories.list();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { categories } = createEntrepreneurRepositories(dbUrl);
    const cat = await categories.create(body);
    return NextResponse.json(cat, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create category" },
      { status: 500 },
    );
  }
}
```

`apps/dashboard/src/app/api/ventures/categories/[id]/route.ts`:
```typescript
import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";

const dbUrl = process.env.DATABASE_URL!;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { categories } = createEntrepreneurRepositories(dbUrl);
    const cat = await categories.update(id, body);
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json(cat);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update category" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { categories } = createEntrepreneurRepositories(dbUrl);
    const deleted = await categories.delete(id);
    if (!deleted) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete category" },
      { status: 500 },
    );
  }
}
```

---

### Task 5: Product API Routes

**Files:**
- Create: `apps/dashboard/src/app/api/products/route.ts`
- Create: `apps/dashboard/src/app/api/products/[id]/route.ts`

- [ ] **Step 1: Create products list + create route**

`apps/dashboard/src/app/api/products/route.ts`:
```typescript
import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const { products } = createEntrepreneurRepositories(dbUrl);
    const result = await products.list({
      ventureId: searchParams.get("ventureId") ?? undefined,
      page: parseInt(searchParams.get("page") ?? "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") ?? "50", 10),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch products" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { products } = createEntrepreneurRepositories(dbUrl);
    const product = await products.create({ ...body, createdBy: session.user.id });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create product" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Create product detail + update + delete route**

`apps/dashboard/src/app/api/products/[id]/route.ts`:
```typescript
import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { products } = createEntrepreneurRepositories(dbUrl);
    const product = await products.getById(id);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch product" },
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
    const { products } = createEntrepreneurRepositories(dbUrl);
    const product = await products.update(id, body);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { products } = createEntrepreneurRepositories(dbUrl);
    const deleted = await products.delete(id);
    if (!deleted) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete product" },
      { status: 500 },
    );
  }
}
```

---

### Task 6: Dashboard Ventures List Page

**Files:**
- Create: `apps/dashboard/src/app/dashboard/ventures/page.tsx`
- Create: `apps/dashboard/src/app/dashboard/ventures/components/venture-table.tsx`

- [ ] **Step 1: Create ventures list page**

`apps/dashboard/src/app/dashboard/ventures/page.tsx`:
```typescript
"use client";

import { useState, useEffect } from "react";
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Badge, Card, CardContent } from "@repo/ui";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface VentureRow {
  id: string;
  name: string | null;
  slug: string;
  status: string;
  contentStatus: string;
  industry: string | null;
  isFeatured: boolean | null;
  createdAt: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  acquired: "Acquired",
  closed: "Closed",
};

const CONTENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const CONTENT_STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  published: "success",
  archived: "outline",
};

export default function VenturesPage() {
  const [ventures, setVentures] = useState<VentureRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [contentStatusFilter, setContentStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (contentStatusFilter) params.set("contentStatus", contentStatusFilter);

    fetch(`/api/ventures?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setVentures(data.ventures ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, contentStatusFilter]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Ventures</h1>
        <Link href="/dashboard/ventures/new">
          <Button><Plus size={16} style={{ marginRight: 6 }} />New Venture</Button>
        </Link>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <Input
            placeholder="Search ventures..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger style={{ width: 140 }}>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={contentStatusFilter} onValueChange={(v) => { setContentStatusFilter(v); setPage(1); }}>
          <SelectTrigger style={{ width: 140 }}>
            <SelectValue placeholder="Publish State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All States</SelectItem>
            {Object.entries(CONTENT_STATUS_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
      ) : ventures.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No ventures found</div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {ventures.map((v) => (
              <Card key={v.id}>
                <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                  <div style={{ flex: 1 }}>
                    <Link href={`/dashboard/ventures/${v.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}>
                        {v.name || "Unnamed Venture"}
                      </div>
                    </Link>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                      {v.industry && <span>{v.industry}</span>}
                      {v.createdAt && <span>{v.industry ? " · " : ""}{new Date(v.createdAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge variant={v.isFeatured ? "default" : "outline"} style={{ fontSize: 11 }}>
                      {v.status}
                    </Badge>
                    <Badge variant={CONTENT_STATUS_VARIANTS[v.contentStatus] || "outline"}>
                      {CONTENT_STATUS_LABELS[v.contentStatus] || v.contentStatus}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 24 }}>
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={14} style={{ marginRight: 4 }} /> Previous
              </Button>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next <ChevronRight size={14} style={{ marginLeft: 4 }} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create venture-table.tsx component**

A reusable DataTable wrapper for the ventures list. Create minimal file since the main page already handles listing:

`apps/dashboard/src/app/dashboard/ventures/components/venture-table.tsx`:
```typescript
"use client";

import { Card, CardContent, Badge } from "@repo/ui";
import Link from "next/link";

interface VentureRow {
  id: string;
  name: string | null;
  slug: string;
  status: string;
  contentStatus: string;
  industry: string | null;
  isFeatured: boolean | null;
  createdAt: string | null;
}

interface VentureTableProps {
  ventures: VentureRow[];
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active", paused: "Paused", acquired: "Acquired", closed: "Closed",
};

const CONTENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", published: "Published", archived: "Archived",
};

export function VentureTable({ ventures }: VentureTableProps) {
  if (ventures.length === 0) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No ventures found</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {ventures.map((v) => (
        <Card key={v.id}>
          <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
            <div style={{ flex: 1 }}>
              <Link href={`/dashboard/ventures/${v.id}`} style={{ textDecoration: "none" }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}>
                  {v.name || "Unnamed Venture"}
                </div>
              </Link>
              {v.industry && (
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{v.industry}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge variant="outline" style={{ fontSize: 11 }}>{STATUS_LABELS[v.status] || v.status}</Badge>
              <Badge variant={v.contentStatus === "published" ? "success" : v.contentStatus === "draft" ? "secondary" : "outline"}>
                {CONTENT_STATUS_LABELS[v.contentStatus] || v.contentStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

### Task 7: Dashboard Venture Detail Page

**Files:**
- Create: `apps/dashboard/src/app/dashboard/ventures/[id]/page.tsx`
- Create: `apps/dashboard/src/app/dashboard/ventures/components/venture-detail-profile.tsx`
- Create: `apps/dashboard/src/app/dashboard/ventures/components/venture-products.tsx`
- Create: `apps/dashboard/src/app/dashboard/ventures/components/venture-timeline.tsx`
- Create: `apps/dashboard/src/app/dashboard/ventures/components/venture-media.tsx`
- Create: `apps/dashboard/src/app/dashboard/ventures/components/venture-categories.tsx`

- [ ] **Step 1: Create venture detail page**

`apps/dashboard/src/app/dashboard/ventures/[id]/page.tsx`:
```typescript
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import { ArrowLeft } from "lucide-react";
import { VentureDetailProfile } from "../../components/venture-detail-profile";
import { VentureProducts } from "../../components/venture-products";
import { VentureTimeline } from "../../components/venture-timeline";
import { VentureMedia } from "../../components/venture-media";
import { VentureCategories } from "../../components/venture-categories";

interface VentureData {
  id: string;
  name: string | null;
  slug: string;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  website: string | null;
  foundedDate: string | null;
  status: string;
  contentStatus: string;
  isFeatured: boolean | null;
  socialLinks: Record<string, string> | null;
  metrics: Record<string, unknown> | null;
  teamSize: number | null;
  industry: string | null;
  stage: string | null;
  location: string | null;
  products: any[];
  timeline: any[];
  categories: any[];
}

export default function VentureDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [venture, setVenture] = useState<VentureData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVenture = () => {
    setLoading(true);
    fetch(`/api/ventures/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setVenture(data))
      .catch(() => router.push("/dashboard/ventures"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVenture();
  }, [params.id]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>;
  }

  if (!venture) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Venture not found</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/ventures")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
          {venture.name || "Unnamed Venture"}
        </h1>
      </div>

      <Tabs defaultValue="profile">
        <TabsList style={{ marginBottom: 24 }}>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="media">Media Coverage</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <VentureDetailProfile venture={venture} onUpdate={fetchVenture} />
        </TabsContent>

        <TabsContent value="products">
          <VentureProducts ventureId={venture.id} products={venture.products} onUpdate={fetchVenture} />
        </TabsContent>

        <TabsContent value="timeline">
          <VentureTimeline ventureId={venture.id} events={venture.timeline} onUpdate={fetchVenture} />
        </TabsContent>

        <TabsContent value="media">
          <VentureMedia ventureId={venture.id} />
        </TabsContent>

        <TabsContent value="categories">
          <VentureCategories ventureId={venture.id} selected={venture.categories} onUpdate={fetchVenture} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Create venture-detail-profile.tsx**

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Badge } from "@repo/ui";

const VENTURE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "acquired", label: "Acquired" },
  { value: "closed", label: "Closed" },
];

const CONTENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const STAGES = [
  { value: "idea", label: "Idea" },
  { value: "pre-seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "growth", label: "Growth" },
  { value: "mature", label: "Mature" },
];

interface VentureProfileProps {
  venture: any;
  onUpdate: () => void;
}

export function VentureDetailProfile({ venture, onUpdate }: VentureProfileProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...venture });

  const handleSave = async () => {
    const { id, products, timeline, categories, createdAt, updatedAt, ...updateData } = form;
    const res = await fetch(`/api/ventures/${venture.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });
    if (res.ok) {
      setEditing(false);
      onUpdate();
    }
  };

  const field = (label: string, value: string | null | undefined) =>
    value ? (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{value}</div>
      </div>
    ) : null;

  return (
    <Card>
      <CardHeader style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <CardTitle>Venture Profile</CardTitle>
        {editing ? (
          <div style={{ display: "flex", gap: 4 }}>
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => { setEditing(false); setForm({ ...venture }); }}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Name</div>
              <Input value={form.name || ""} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Slug</div>
              <Input value={form.slug || ""} onChange={(e) => setForm((f: any) => ({ ...f, slug: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Description</div>
              <Textarea value={form.description || ""} onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Website</div>
              <Input value={form.website || ""} onChange={(e) => setForm((f: any) => ({ ...f, website: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Logo URL</div>
              <Input value={form.logo || ""} onChange={(e) => setForm((f: any) => ({ ...f, logo: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Cover Image URL</div>
              <Input value={form.coverImage || ""} onChange={(e) => setForm((f: any) => ({ ...f, coverImage: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Status</div>
                <Select value={form.status} onValueChange={(v) => setForm((f: any) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENTURE_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Content Status</div>
                <Select value={form.contentStatus} onValueChange={(v) => setForm((f: any) => ({ ...f, contentStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Industry</div>
                <Input value={form.industry || ""} onChange={(e) => setForm((f: any) => ({ ...f, industry: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Stage</div>
                <Select value={form.stage} onValueChange={(v) => setForm((f: any) => ({ ...f, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Location</div>
                <Input value={form.location || ""} onChange={(e) => setForm((f: any) => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Team Size</div>
                <Input type="number" value={form.teamSize ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, teamSize: e.target.value ? parseInt(e.target.value) : null }))} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Founded Date</div>
                <Input type="date" value={form.foundedDate || ""} onChange={(e) => setForm((f: any) => ({ ...f, foundedDate: e.target.value }))} />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <div>
                {field("Slug", venture.slug)}
                {field("Website", venture.website)}
                {field("Industry", venture.industry)}
                {field("Stage", venture.stage)}
                {field("Location", venture.location)}
              </div>
              <div>
                {field("Status", venture.status)}
                {field("Content Status", venture.contentStatus)}
                {field("Team Size", venture.teamSize?.toString())}
                {field("Founded", venture.foundedDate ? new Date(venture.foundedDate).toLocaleDateString() : null)}
                {field("Featured", venture.isFeatured ? "Yes" : "No")}
              </div>
            </div>
            {venture.description && (
              <div style={{ marginTop: 12, padding: 12, backgroundColor: "var(--bg-muted)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Description</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{venture.description}</div>
              </div>
            )}
            {venture.socialLinks && Object.keys(venture.socialLinks).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Social Links</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {Object.entries(venture.socialLinks).map(([key, val]) => (
                    <Badge key={key} variant="outline">{key}: {val as string}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create venture-products.tsx**

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Badge } from "@repo/ui";
import { Plus, ExternalLink } from "lucide-react";

interface Product {
  id: string;
  name: string | null;
  description: string | null;
  launchDate: string | null;
  url: string | null;
  status: string;
  isFeatured: boolean | null;
}

interface VentureProductsProps {
  ventureId: string;
  products: Product[];
  onUpdate: () => void;
}

export function VentureProducts({ ventureId, products, onUpdate }: VentureProductsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", url: "", launchDate: "" });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.name) return;
    setLoading(true);
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ventureId, slug: form.name.toLowerCase().replace(/\s+/g, "-") }),
    });
    setLoading(false);
    setDialogOpen(false);
    setForm({ name: "", description: "", url: "", launchDate: "" });
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    onUpdate();
  };

  return (
    <Card>
      <CardHeader style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <CardTitle>Products ({products.length})</CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus size={14} style={{ marginRight: 4 }} />Add Product</Button>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No products yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {products.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.description}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /></a>}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input placeholder="Product Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            <Input placeholder="URL" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
            <Input type="date" placeholder="Launch Date" value={form.launchDate} onChange={(e) => setForm((f) => ({ ...f, launchDate: e.target.value }))} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={loading || !form.name}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
```

- [ ] **Step 4: Create venture-timeline.tsx**

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui";
import { Plus } from "lucide-react";

interface TimelineEvent {
  id: string;
  eventType: string | null;
  title: string | null;
  description: string | null;
  eventDate: string | null;
  icon: string | null;
  url: string | null;
}

const EVENT_TYPES = [
  { value: "milestone", label: "Milestone" },
  { value: "launch", label: "Launch" },
  { value: "acquisition", label: "Acquisition" },
  { value: "release", label: "Release" },
  { value: "event", label: "Event" },
];

interface VentureTimelineProps {
  ventureId: string;
  events: TimelineEvent[];
  onUpdate: () => void;
}

export function VentureTimeline({ ventureId, events, onUpdate }: VentureTimelineProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ eventType: "milestone", title: "", description: "", eventDate: "" });
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!form.title) return;
    setLoading(true);
    await fetch(`/api/ventures/${ventureId}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setDialogOpen(false);
    setForm({ eventType: "milestone", title: "", description: "", eventDate: "" });
    onUpdate();
  };

  return (
    <Card>
      <CardHeader style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <CardTitle>Timeline ({events.length})</CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus size={14} style={{ marginRight: 4 }} />Add Event</Button>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No timeline events</div>
        ) : (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 15, top: 0, bottom: 0, width: 2, backgroundColor: "var(--border)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {events.map((e) => (
                <div key={e.id} style={{ display: "flex", gap: 12, position: "relative" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "var(--bg-card)", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, fontSize: 14 }}>
                    {e.eventType === "launch" ? "🚀" : e.eventType === "acquisition" ? "🤝" : e.eventType === "milestone" ? "🏆" : e.eventType === "release" ? "📦" : "📌"}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{e.title}</div>
                    {e.description && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{e.description}</div>}
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {e.eventDate ? new Date(e.eventDate).toLocaleDateString() : ""}
                      {e.eventType && <span> · {e.eventType}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Timeline Event</DialogTitle></DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Select value={form.eventType} onValueChange={(v) => setForm((f) => ({ ...f, eventType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            <Input type="date" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={loading || !form.title}>Add Event</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
```

- [ ] **Step 5: Create venture-media.tsx**

```typescript
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";
import { ExternalLink } from "lucide-react";

interface MediaItem {
  id: string;
  title: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  publishedDate: string | null;
  isFeatured: boolean | null;
}

interface VentureMediaProps {
  ventureId: string;
}

export function VentureMedia({ ventureId }: VentureMediaProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ventures/${ventureId}/media`)
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ventureId]);

  return (
    <Card>
      <CardHeader><CardTitle>Media Coverage ({items.length})</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No media coverage yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{m.title || "Untitled"}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {m.sourceName && <span>{m.sourceName}</span>}
                    {m.publishedDate && <span>{m.sourceName ? " · " : ""}{new Date(m.publishedDate).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {m.isFeatured && <Badge variant="default" style={{ fontSize: 11 }}>Featured</Badge>}
                  {m.sourceUrl && <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /></a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Create venture-categories.tsx**

```typescript
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@repo/ui";
import { Plus, X } from "lucide-react";

interface Category {
  id: string;
  name: string | null;
  slug: string;
}

interface VentureCategoriesProps {
  ventureId: string;
  selected: Category[];
  onUpdate: () => void;
}

export function VentureCategories({ ventureId, selected, onUpdate }: VentureCategoriesProps) {
  const [allCats, setAllCats] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    fetch("/api/ventures/categories")
      .then((r) => r.json())
      .then((data) => setAllCats(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const addCategory = async () => {
    if (!selectedId) return;
    const ids = [...selected.map((c) => c.id), selectedId];
    await fetch(`/api/ventures/${ventureId}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryIds: ids }),
    });
    setSelectedId("");
    onUpdate();
  };

  const removeCategory = async (catId: string) => {
    const ids = selected.filter((c) => c.id !== catId).map((c) => c.id);
    await fetch(`/api/ventures/${ventureId}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryIds: ids }),
    });
    onUpdate();
  };

  const availableCats = allCats.filter((c) => !selected.some((s) => s.id === c.id));

  return (
    <Card>
      <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
      <CardContent>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger style={{ flex: 1 }}><SelectValue placeholder="Select category..." /></SelectTrigger>
            <SelectContent>
              {availableCats.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name || c.slug}</SelectItem>))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={addCategory} disabled={!selectedId}><Plus size={14} /></Button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {selected.length === 0 ? (
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>No categories assigned</span>
          ) : (
            selected.map((c) => (
              <Badge key={c.id} variant="secondary" style={{ cursor: "pointer" }} onClick={() => removeCategory(c.id)}>
                {c.name || c.slug} <X size={12} style={{ marginLeft: 4 }} />
              </Badge>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Task 8: Dashboard Venture Create Page

**Files:**
- Create: `apps/dashboard/src/app/dashboard/ventures/new/page.tsx`

- [ ] **Step 1: Create venture create page**

`apps/dashboard/src/app/dashboard/ventures/new/page.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@repo/ui";
import { ArrowLeft } from "lucide-react";

const VENTURE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "acquired", label: "Acquired" },
  { value: "closed", label: "Closed" },
];

const STAGES = [
  { value: "idea", label: "Idea" },
  { value: "pre-seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "growth", label: "Growth" },
  { value: "mature", label: "Mature" },
];

export default function NewVenturePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", website: "", logo: "",
    industry: "", stage: "idea", location: "", teamSize: "",
    foundedDate: "", status: "active",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ventures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          teamSize: form.teamSize ? parseInt(form.teamSize) : null,
        }),
      });
      if (res.ok) {
        const venture = await res.json();
        router.push(`/dashboard/ventures/${venture.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/ventures")}>
          <ArrowLeft size={16} />
        </Button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>New Venture</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Venture Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Name *</div>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))} required />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Slug *</div>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Description</div>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Website</div>
                  <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Logo URL</div>
                  <Input value={form.logo} onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Industry</div>
                  <Input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Stage</div>
                  <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Location</div>
                  <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Team Size</div>
                  <Input type="number" value={form.teamSize} onChange={(e) => setForm((f) => ({ ...f, teamSize: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Founded Date</div>
                  <Input type="date" value={form.foundedDate} onChange={(e) => setForm((f) => ({ ...f, foundedDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Status</div>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger style={{ width: 200 }}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENTURE_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <Button type="button" variant="outline" onClick={() => router.push("/dashboard/ventures")}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Venture"}</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Task 9: Navigation Update

**File:**
- Modify: `apps/dashboard/src/app/dashboard/ventures/page.tsx` (already handles listing)
- The navigation.ts already has the Ventures link under Content group (no change needed)
- The route-authorization.ts already has the guard (no change needed)
- Breadcrumbs already defined (no change needed)

---

### Task 10: Verification

- [ ] **Step 1: Typecheck the entire project**

Run: `cd G:\Portfolio-V2 && npx tsc --noEmit --project apps/dashboard/tsconfig.json`
Expected: No CRM-related errors (pre-existing errors tolerated)

- [ ] **Step 2: Test the dev server loads the ventures page**

The middleware should redirect to login (confirms route compiles):
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/ventures
```
Expected: 307 (redirect to login)

- [ ] **Step 3: Verify API routes respond**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/ventures
```
Expected: 307 (redirect to login via middleware)

- [ ] **Step 4: Generate Phase 09 deliverables**

Create:
- `docs/superpowers/reports/PHASE09_REVIEW.md`
- `docs/superpowers/reports/PHASE09_REPORT.md`
- `docs/superpowers/reports/PHASE09_ACCEPTANCE_REPORT.md`
- `docs/superpowers/reports/PHASE09_CLOSEOUT_REPORT.md`
