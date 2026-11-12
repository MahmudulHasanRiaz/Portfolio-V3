# Phase 13 — SEO System: Implementation Plan

**Goal:** Build the complete SEO foundation — metadata engine, Open Graph, Twitter Cards, canonical URLs, structured data (JSON-LD), sitemap generation, robots.txt, redirect management, SEO dashboard, validation layer.

**Architecture:** Reuse existing `@repo/seo` package (already has metadata, OG, Twitter, canonical, robots, structured-data generators). Add sitemap, validation, missing schema types. Wire into `apps/dashboard` for API routes, sitemap.xml, robots.txt, and admin UI.

## Task 1: Add missing schema generators + json-ld helper
- Files: `packages/seo/src/structured-data.ts`, `packages/seo/src/index.ts`
- Add: `generateWebsiteSchema()`, `generateWebPageSchema()`, `generateCreativeWorkSchema()`
- Add: `generateJsonLd()` helper that wraps schema in `<script type="application/ld+json">` string

## Task 2: Create sitemap generation module
- File: `packages/seo/src/sitemap.ts`
- Types: SitemapEntry, SitemapChangeFreq
- Functions: `generateSitemapXml(entries)`, `generateSitemapIndex(sitemaps)`
- Queries all published content from 6 entity types (pages, posts, services, projects, ventures, releases)
- Excludes drafts via status/contentStatus filtering

## Task 3: Create SEO validation module + endpoint
- File: `packages/seo/src/validation.ts`
- Functions: `validateMetadata(entity)`, `validateSitemap(entries)`, `detectConflicts(redirects)`
- API route: `apps/dashboard/src/app/api/seo/validate/route.ts`

## Task 4: Create sitemap.xml + robots.txt routes
- Files: `apps/dashboard/src/app/sitemap.xml/route.ts`, `apps/dashboard/src/app/robots.txt/route.ts`
- Sitemap: dynamic XML generation from published content
- Robots: environment-aware (block all in dev, allow all in prod)

## Task 5: Create SEO metadata API CRUD routes
- Files: `apps/dashboard/src/app/api/seo/meta/route.ts`, `apps/dashboard/src/app/api/seo/meta/[id]/route.ts`
- GET list, GET by entity, POST create/upsert, PUT update, DELETE

## Task 6: Create redirect API CRUD routes
- Files: `apps/dashboard/src/app/api/seo/redirects/route.ts`, `apps/dashboard/src/app/api/seo/redirects/[id]/route.ts`
- Reuse existing `slug_redirects` table + `SlugRedirectsRepository`

## Task 7: Build SEO Dashboard pages
- Files under `apps/dashboard/src/app/dashboard/seo/`
- Overview (existing page.tsx — update with real data)
- metadata/page.tsx, redirects/page.tsx, sitemap/page.tsx, validation/page.tsx

## Task 8: Update navigation + middleware
- File: `apps/dashboard/src/lib/navigation.ts` — add SEO sub-items
- File: `apps/dashboard/src/middleware.ts` — add `/sitemap.xml`, `/robots.txt` to public prefixes

## Task 9: Typecheck, verify, and write 4 deliverable reports
