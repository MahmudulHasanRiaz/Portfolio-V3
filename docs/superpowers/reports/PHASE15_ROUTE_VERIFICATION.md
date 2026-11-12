# Phase 15 — Route Verification Report

## Route Map (apps/web, port 3002)

### Marketing Pages (in `(marketing)` route group)
| Route | File | Status |
|-------|------|--------|
| `/` | `(marketing)/page.tsx` | ✅ Dynamic homepage from `homepageSections` |
| `/about` | `(marketing)/about/page.tsx` | ✅ Person profile + developer/entrepreneur profile data |
| `/contact` | `(marketing)/contact/page.tsx` | ✅ Client form → `POST /api/contact` |
| `/faq` | `(marketing)/faq/page.tsx` | ✅ FAQPage JSON-LD |
| `/blog` | `(marketing)/blog/page.tsx` | ✅ Paginated listing |
| `/blog/[slug]` | `(marketing)/blog/[slug]/page.tsx` | ✅ Article JSON-LD |
| `/services` | `(marketing)/services/page.tsx` | ✅ Grid listing |
| `/services/[slug]` | `(marketing)/services/[slug]/page.tsx` | ✅ Service JSON-LD |
| `/projects` | `(marketing)/projects/page.tsx` | ✅ Portfolio grid |
| `/projects/[slug]` | `(marketing)/projects/[slug]/page.tsx` | ✅ CreativeWork JSON-LD |
| `/case-studies` | `(marketing)/case-studies/page.tsx` | ✅ Listing from `case_studies` table |
| `/case-studies/[slug]` | `(marketing)/case-studies/[slug]/page.tsx` | ✅ Metrics + sections |
| `/ventures` | `(marketing)/ventures/page.tsx` | ✅ From `ventures` table |
| `/ventures/[slug]` | `(marketing)/ventures/[slug]/page.tsx` | ✅ Breadcrumb JSON-LD |
| `/releases` | `(marketing)/releases/page.tsx` | ✅ From `releases` table |
| `/releases/[slug]` | `(marketing)/releases/[slug]/page.tsx` | ✅ CreativeWork JSON-LD |
| `/[slug]` | `(marketing)/[slug]/page.tsx` | ✅ Catch-all — excludes static slugs |
| `/search` | `(marketing)/search/page.tsx` | ✅ Client search via proxy API |

### API Routes
| Route | Method | File | Status |
|-------|--------|------|--------|
| `/api/search` | POST | `api/search/route.ts` | ✅ Proxy — queries `search_index` directly |
| `/api/contact` | POST | `api/contact/route.ts` | ✅ Zod + rate limit + honeypot |

### SEO Routes
| Route | File | Status |
|-------|------|--------|
| `/sitemap.xml` | `sitemap.xml/route.ts` | ✅ Dynamic — uses `@repo/seo` `generateSitemapXml()` |
| `/robots.txt` | `robots.txt/route.ts` | ✅ Environment-aware |

### Layout Hierarchy
| Layout | File | Children |
|--------|------|----------|
| Root | `layout.tsx` | All routes — inter font, CSS tokens, ToastProvider |
| Marketing | `(marketing)/layout.tsx` | All marketing pages — nav, footer, Person+Website JSON-LD, analytics |

## Route Count
- **22 routes total**: 18 marketing pages, 2 API endpoints, 2 SEO routes
- **0 missing routes** per architecture plan

## Key Design Decisions
- SEO routes (`sitemap.xml`, `robots.txt`) in `apps/web` (not dashboard) — duplicate of dashboard's copies, production DNS determines which serves
- Search uses direct DB query via `@repo/database` (no dashboard API dependency)
- Contact uses dedicated endpoint with 3-layer protection (zod → rate limit → honeypot)
