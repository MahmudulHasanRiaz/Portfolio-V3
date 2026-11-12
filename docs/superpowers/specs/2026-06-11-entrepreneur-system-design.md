# Phase 09 — Entrepreneur System Design

## Architecture

The Entrepreneur system follows the same architecture as Phase 08 (CRM):
- Business logic in `packages/entrepreneur/` with repository pattern + postgres driver
- API routes in `apps/dashboard/src/app/api/ventures/` and `apps/dashboard/src/app/api/products/`
- Dashboard pages under `apps/dashboard/src/app/dashboard/ventures/`
- DB schema extends existing `entrepreneur/` and `content/` tables

## Database Changes

### ventures — add columns
| Column | Type | Notes |
|---|---|---|
| `content_status` | `content_status` enum | `draft/published/archived` |
| `cover_image` | `text` | Cover photo URL |
| `social_links` | `jsonb` | `{linkedin, twitter, github, ...}` |
| `metrics` | `jsonb` | `{funding, revenue, ...}` |
| `team_size` | `integer` | Headcount |
| `industry` | `text` | Industry name |
| `stage` | `text` | `idea/pre-seed/seed/growth/mature` |
| `location` | `text` | HQ location |

### New: venture_categories
- `id: uuid PK`
- `name: text`
- `slug: varchar(255) unique`
- `description: text`

### New: venture_category_assignments
- `ventureId: uuid (FK -> ventures.id)`
- `categoryId: uuid (FK -> venture_categories.id)`
- Composite PK: `(ventureId, categoryId)`

### products — add columns
| Column | Type | Notes |
|---|---|---|
| `content_status` | `content_status` enum | CMS lifecycle |
| `media` | `jsonb` | Screenshots, videos |
| `highlights` | `jsonb` | Bullets, badges, features |

### media_mentions — add column
| Column | Type | Notes |
|---|---|---|
| `venture_id` | `uuid` | FK to ventures (optional) |

### timeline_events — no schema changes
Use `source_type = 'venture'` + `source_id = venture.id`

### entrepreneur_profiles — no schema changes
Already extends `person_profiles` as designed in Shared Identity Architecture.

## Package: packages/entrepreneur/

### errors.ts
- `EntrepreneurError` base class
- `VentureNotFoundError`
- `ProductNotFoundError`

### types.ts
- `VentureRow` — full venture shape with all new fields
- `ProductRow` — product shape with venture relation
- `VentureFilters` — search, status, contentStatus, category, industry, page, pageSize
- `VentureListResponse` — paginated response

### venture-repository.ts
- `list(filters)` — paginated with search, status, contentStatus, category, industry filters
- `getById(id)` — single venture
- `getBySlug(slug)` — by slug (for public routes)
- `create(data)` — INSERT + RETURNING
- `update(id, data)` — PATCH + RETURNING
- `delete(id)` — soft or hard delete
- `getCategories(ventureId)` — get assigned categories
- `setCategories(ventureId, categoryIds)` — replace category assignments

### product-repository.ts
- `list(filters)` — paginated, filterable by ventureId
- `getById(id)`
- `create(data)`
- `update(id, data)`
- `delete(id)`

### timeline-repository.ts
- `getByVentureId(ventureId)` — fetch timeline_events where source_type='venture'
- `addEvent(ventureId, eventData)` — INSERT into timeline_events
- `deleteEvent(eventId)`

### category-repository.ts
- `list()` — all categories
- `create(data)`
- `update(id, data)`
- `delete(id)`

### index.ts
- Barrel exports
- `createEntrepreneurRepositories(connectionString)` factory

## API Routes

### `/api/ventures`
- `GET` — list (paginated, search, status, contentStatus, category, industry filters)
- `POST` — create (auth: super_admin, admin)

### `/api/ventures/[id]`
- `GET` — single venture with products, timeline, categories, media
- `PATCH` — update
- `DELETE` — delete

### `/api/ventures/[id]/products`
- `GET` — products for this venture
- `POST` — add product to venture

### `/api/ventures/[id]/timeline`
- `GET` — timeline events for this venture
- `POST` — add timeline event

### `/api/ventures/[id]/categories`
- `GET` — categories for this venture
- `POST` — set categories for this venture

### `/api/ventures/[id]/media`
- `GET` — media mentions for this venture

### `/api/products`
- `GET` — list all products
- `POST` — create product (auth: super_admin, admin)

### `/api/products/[id]`
- `GET` — single product
- `PATCH` — update
- `DELETE` — delete

### `/api/venture-categories`
- `GET` — list all categories
- `POST` — create category

### `/api/venture-categories/[id]`
- `PATCH` — update
- `DELETE` — delete

## Dashboard Pages

### `/dashboard/ventures/` — List page
- DataTable with columns: name, status, contentStatus, industry, featured, created
- Search bar, status/contentStatus filter dropdowns
- Create Venture button
- Pagination

### `/dashboard/ventures/[id]/` — Detail page
- Venture profile card (editable: name, slug, description, logo, cover, website, social links)
- Venture metrics card (team_size, industry, stage, location, funding, revenue)
- Categories management (add/remove)
- Products sub-list (create, edit, delete)
- Timeline events (add milestones, launches)
- Media coverage sub-list

### `/dashboard/ventures/new/` — Create form
- Full form with all venture fields
- Redirects to detail page on creation

## Entrepreneur Profile (Identity Layer)

No new UI yet — the `entrepreneur_profiles` table already extends `person_profiles`. The entrepreneur profile editor belongs to the Identity/Profile management feature, not to the Venture management feature.

## Public Data Layer

The repositories export typed query methods that the public website can import. No public pages built yet.

## Implementation Order

1. Database schema migrations (add columns, create categories tables)
2. `packages/entrepreneur/` — repository package
3. Venture + Product + Category API routes
4. Dashboard venture list page
5. Dashboard venture detail page
6. Dashboard venture create/edit page
7. Verification
