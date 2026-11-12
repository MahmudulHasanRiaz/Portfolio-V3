# Phase 15 — Architecture Compliance Report

## Architecture Plan Adjustments

The following adjustments were mandated during plan approval. All are verified compliant.

### 1. Contact Endpoint (Not `/api/leads` exposure)
**Requirement:** Do NOT expose `/api/leads` publicly. Create dedicated `POST /api/contact`.

**Implementation:**
- `apps/web/src/app/api/contact/route.ts`
- **Zod validation:** `contactSchema` with `name`, `email`, `subject`, `message` — min/max length + email format
- **Rate limiting:** In-memory map per IP — 5 requests per 60-second sliding window, returns 429
- **Honeypot:** Hidden `website` field in form + corresponding `honeypot` field in schema (`.max(0)` — rejects any filled value)
- **Output:** Creates CRM lead with `fullName`, `email`, `inquiryType`, `message`, `leadSource: "website_contact"`, `status: "new"`
- **Status:** ✅ Compliant

### 2. Search Proxy Routes (No Dashboard API Dependency)
**Requirement:** Do NOT call dashboard search APIs from client components. Create proxy routes inside `apps/web`.

**Implementation:**
- `apps/web/src/app/api/search/route.ts` — `POST` endpoint
- Direct database query on `search_index` table using `ilike` across `title`, `content`, `summary`
- Results sorted by `publishedAt` desc (most recent first)
- Analytics logging to `search_analytics` table (best-effort)
- **Status:** ✅ Compliant — `apps/web` has zero runtime dependencies on dashboard URLs

### 3. Fully CMS-Driven Homepage
**Requirement:** Homepage must be fully CMS-driven. No hardcoded sections.

**Implementation:**
- `apps/web/src/app/(marketing)/page.tsx`
- Uses `HomepageService.getSections()` which queries `homepage_sections` table filtered by `isVisible = true`, ordered by `sortOrder`
- `SectionRenderer` component dispatches by `sectionKey` to type-specific renderers (hero, services, projects, blog, cta, stats, testimonials, generic)
- Editor-controlled: ordering, visibility, and content all from dashboard's homepage management UI
- **Status:** ✅ Compliant — zero hardcoded sections

## Architecture Plan — All 8 Categories

### 1. Route Map ✅
18 marketing pages + 2 API + 2 SEO routes — matches plan exactly.

### 2. Layout Hierarchy ✅
Root layout (`layout.tsx`) → Marketing layout (`(marketing)/layout.tsx`) → Page content. No auth boundary, no middleware needed.

### 3. Shared Identity Usage ✅
`getPublicProfile()` joins `person_profiles` + `developer_profiles` + `entrepreneur_profiles` + `artist_profiles`. Used by nav, footer, about page, JSON-LD.

### 4. SEO Integration ✅
| Component | Schema Type |
|-----------|-------------|
| Site-wide | `PersonSchema` + `WebsiteSchema` with SearchAction |
| Blog | `ArticleSchema` |
| Services | `ServiceSchema` |
| Projects | `CreativeWorkSchema` |
| Releases | `CreativeWorkSchema` |
| FAQ | `FAQPage` (MainEntity) |
| Custom pages | `WebPageSchema` + `BreadcrumbList` |
| All pages | `BreadcrumbList` |
| Sitemap | Dynamic XML from `generateSitemapXml()` |
| Robots | Environment-aware |

### 5. Search Integration ✅
- Proxy `POST /api/search` — direct DB query on `search_index` table
- Client components call `/api/search` (same origin, no CORS)
- Search analytics logged

### 6. Analytics Integration ✅
- `AnalyticsScript` client component — runs on every page
- Tracks `anonymousId`, `url`, `referrer`, `userAgent`, `screenSize`, `timestamp`
- Anonymous ID stored in `localStorage`
- Calls configurable endpoint (`NEXT_PUBLIC_ANALYTICS_API`)

### 7. Reusable Components ✅
| Layer | Components |
|-------|-----------|
| Layout | `PublicNav`, `PublicFooter`, `SectionContainer` |
| Sections | `SectionRenderer` with 8 section type renderers |
| Analytics | `AnalyticsScript` |

### 8. Public API Consumption ✅
| Data Source | Method |
|-------------|--------|
| Database (all content) | Direct via `@repo/cms` + `@repo/database` (server components) |
| SEO | Direct via `@repo/seo` (server components) |
| Search | Direct DB query (server endpoint) |
| Analytics | Client component → configured endpoint |
| Contact | Client form → `POST /api/contact` (internal) |
