# Phase 15 — Remaining Gaps

## Intentional Gaps (Out of Scope Per Instructions)

| Gap | Reason |
|-----|--------|
| No UI beautification/polish | Explicit instruction: "Prioritize architecture and functionality. Do not spend time on UI beautification. Use existing dashboard design patterns." |
| No responsive/mobile optimization | Architecture-first — layout works but uses CSS variables + inline styles only |
| No unit/E2E tests | No test suite exists in the project. Architecture priority. |
| No image optimization beyond basic `<Image>` | Content images rely on CMS media URLs — no CDN optimization layer |
| No dark mode toggle | Design system tokens support `data-theme="dark"` — site currently uses dark only |
| No loading skeletons/spinners | All pages use SSR — no streaming/loading patterns yet |
| No error boundaries | Root error boundary not implemented (can use `@repo/ui` `ErrorBoundary` if needed) |
| No i18n/l10n | Content tables have `locale`/`translationGroup` fields but public site serves single locale |

## Technical Gaps

| Gap | Impact | Resolution |
|-----|--------|------------|
| Analytics tracking endpoint config | `NEXT_PUBLIC_ANALYTICS_API` env var — currently has no default. In production, must point to dashboard's `POST /api/analytics/track` | Set env var in deployment |
| Search uses `ilike` (no FTS) | The `search_index` table has a `tsvector` column + GIN index for FTS, but the proxy route uses `ilike` because direct tsquery requires raw SQL. Works but slower on large datasets | Upgrade to `sql` tagged template with `to_tsquery()` for proper FTS |
| No search pagination | Returns max 20 results. No cursor/offset support in search API | Add `offset`/`limit` params to proxy route |
| No 404/500 custom pages | Next.js defaults used | Create `not-found.tsx` and `error.tsx` in `(marketing)` layout |
| No RSS feed | Blog has no feed endpoint | Add `/feed.xml` route using `@repo/seo` sitemap utilities |
| No OpenAPI/route docs | API routes undocumented | Noted for future documentation pass |
| Pre-existing errors suppressed | `noUnusedLocals: false` in `apps/web/tsconfig.json` masks ~80 pre-existing unused import errors in `packages/database` schema files | Not a regression — these existed before Phase 15 |
| Static build fails without DB | All server components query DB at build time | Expected for SSR. Use `next dev` for development, ensure DB running for production build |

## Production Readiness

| Area | Status | Notes |
|------|--------|-------|
| SEO metadata | ✅ Complete | Per-page with JSON-LD |
| Sitemap | ✅ Complete | Dynamic, covers all content types |
| Analytics | ✅ Complete | First-party, no external dep |
| Search | ✅ Complete | Proxy route, analytics logging |
| Contact form | ✅ Complete | Validation + spam protection |
| Identity profile | ✅ Complete | 4-tier profile model |
| Error handling | ⚠️ Basic | Empty states for listing pages, notFound() for details |
| Performance | ⚠️ Basic | SSR, no ISR/streaming configured |
| Monitoring | ❌ None | No Sentry/error tracking wired |
