# System Architecture

> **PRD Reference:** [PRD.md](../PRD.md) — Infrastructure Architecture (§ Infrastructure Architecture), Monorepo Strategy, API & Integration Architecture  
> **Status:** Frozen — CR-03 required for changes  
> **Version:** 1.0

---

## 1. Architecture Overview

The Personal Brand OS Platform is a monolithic Next.js 16 application within a Turborepo monorepo. It operates as a single deployment unit serving three distinct front-end experiences: a public website, an admin dashboard, and a client portal. All three share a common set of packages for database access, authentication, UI components, and business logic.

### Architecture Diagram (Logical)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Cloudflare CDN                             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                        Vercel (Next.js 16)                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   apps/web   │  │apps/dashboard│  │ apps/portal  │              │
│  │  (Public)    │  │   (Admin)    │  │  (Client)    │              │
│  │ SSR + ISR    │  │  SPA + RSC   │  │ Token Auth   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                        │
│  ┌──────┴─────────────────┴─────────────────┴───────────────────┐  │
│  │                     packages/                                 │  │
│  │  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐   │  │
│  │  │ ui   │ auth │database│seo  │email │cms   │crm   │search│   │  │
│  │  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤   │  │
│  │  │events│finance│portal│notifs│freelance│proposals│shared │   │  │
│  │  └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                    External Services Layer                           │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Supabase/   │  │ Cloudflare   │  │   Resend     │              │
│  │  PostgreSQL  │  │     R2       │  │   (Email)    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Sentry     │  │ Cloudflare   │  │Telegram/WA   │              │
│  │ (Monitoring) │  │  Cron Trig.  │  │ (Notifs)     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Runtime & Framework

| Component | Technology | Justification |
|-----------|-----------|---------------|
| Runtime | Next.js 16 on Vercel | SSR, ISR, static generation, edge-ready |
| Frontend | React 19, TypeScript (strict) | Type safety, ecosystem maturity |
| Styling | Tailwind CSS v4, shadcn/ui | Utility-first, design system consistency |
| Animation | Motion (formerly Framer Motion) | Declarative, accessible animations |
| Monorepo | Turborepo | Shared packages, build caching |

### 2.2 Data Layer

| Component | Technology | Justification |
|-----------|-----------|---------------|
| Database | PostgreSQL (Supabase → Self-hosted) | Relational integrity, JSONB support |
| ORM | Drizzle ORM | Type-safe, lightweight, no magic |
| Pattern | Repository Pattern | Vendor lock-in avoidance, testability |
| Cache | Cloudflare CDN, Next.js Cache, React Query | Multi-layer caching strategy |

### 2.3 Infrastructure

| Component | Technology |
|-----------|-----------|
| Hosting | Vercel (web, dashboard, portal) |
| Storage | Cloudflare R2 |
| CDN | Cloudflare Global Network |
| Auth | Better Auth |
| Monitoring | Sentry |
| Analytics | Cloudflare Analytics, Microsoft Clarity, Umami |
| Email | Resend |
| CI/CD | GitHub Actions |
| DNS | Cloudflare |

### 2.4 Background Jobs

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Content Scheduler | Cloudflare Cron Trigger (1-min) | Publish/expire scheduled content |
| Newsletter Dispatcher | Cloudflare Cron Trigger + Resend | Send scheduled campaigns |
| Media Cleanup | Cloudflare Cron Trigger | Remove unused media orphans |
| Notification Dispatcher | Supabase Edge Function | Send Telegram/WhatsApp/Email alerts |

---

## 3. Application Architecture

### 3.1 Monorepo Structure

```
root/
├── apps/
│   ├── web/              # Public website — SSR/ISR
│   ├── dashboard/        # Admin CMS/CRM — SPA + RSC
│   ├── portal/           # Client portal — Token auth, light mode
│   └── docs/             # Documentation
├── packages/
│   ├── ui/               # Shared UI components (shadcn/ui based)
│   ├── auth/             # Better Auth configuration & middleware
│   ├── database/         # Drizzle schema, migrations, repositories
│   ├── validation/       # Zod schemas (shared across apps)
│   ├── seo/              # Metadata, schema.org, sitemap utilities
│   ├── email/            # Resend integration, email templates
│   ├── analytics/        # Cloudflare Analytics, Clarity, Umami
│   ├── cms/              # Content management business logic
│   ├── crm/              # CRM business logic & pipeline
│   ├── search/           # PostgreSQL FTS interface
│   ├── freelance/        # Freelance project lifecycle logic
│   ├── events/           # Artist event management logic
│   ├── finance/          # Payments, invoices, expenses
│   ├── portal/           # Client portal token & session logic
│   ├── proposals/        # Proposal/contract templates
│   ├── notifications/    # Multi-channel notification dispatch
│   └── shared/           # Shared types, constants, utilities
├── tooling/              # ESLint, Prettier, TypeScript configs
├── scripts/              # Build, seed, migration scripts
└── .github/              # GitHub Actions workflows
```

### 3.2 App Architecture per Domain

#### Public Website (`apps/web`)
- Rendering: Server Components by default, ISR for content pages, dynamic for search/forms
- Routing: Next.js App Router, file-based
- Data: Server Components fetch via repositories, hydrated to client where needed
- Forms: Server Actions with Zod validation

#### Admin Dashboard (`apps/dashboard`)
- Rendering: Hybrid — Server Components for list views, SPA for interactive management
- Routing: TanStack Router (client-side within dashboard shell)
- State: TanStack Query for server state, React Hook Form + Zod for forms
- Data: Route Handlers + Server Actions

#### Client Portal (`apps/portal`)
- Rendering: Client-rendered SPA
- Routing: TanStack Router
- Auth: Token-based (portal_token from URL or session)
- Theme: Light mode only (no dark mode)
- Data: Route Handlers + Server Actions

### 3.3 Rendering Strategy

| Page Type | Strategy | Rationale |
|-----------|----------|-----------|
| Homepage | Static + Revalidate | Fastest TTFB, periodic refresh |
| Services | ISR | Content changes infrequently |
| Projects | ISR | Content changes infrequently |
| Blog | ISR | New posts published regularly |
| Releases | ISR | Release schedule is periodic |
| Search | Dynamic | Real-time results |
| Forms | Dynamic | Interactive validation |
| Dashboard | Dynamic (SPA) | Real-time admin operations |
| Portal | Dynamic (SPA) | Real-time client interactions |

---

## 4. Component Architecture

### 4.1 Shared UI Package (`packages/ui`)

Based on shadcn/ui primitives with design system tokens from the PRD:

| Component Layer | Contents |
|----------------|----------|
| Primitives | Button, Input, Select, Card, Dialog, Dropdown, Tabs, Badge, Avatar, Skeleton, Toast, Tooltip, Sheet |
| Form Components | FormField, FormLabel, FormError, RichTextEditor, FileUpload |
| Data Display | DataTable, StatusBadge, Timeline, KanbanBoard |
| Layout | Container, Section, Grid, Stack |
| Navigation | NavBar, Sidebar, Breadcrumb, Tabs, Pagination |
| Feedback | Alert, Toast, Skeleton, EmptyState, ErrorBoundary |
| Animation | FadeIn, SlideUp, ScaleIn, Stagger (Motion wrappers) |

### 4.2 Feature-Based Dashboard Organization

Each dashboard feature follows a consistent structure:

```
features/{feature}/
├── components/       # Feature-specific components
├── hooks/            # Feature-specific hooks (TanStack Query)
├── schemas/          # Zod schemas for forms/validation
├── actions.ts        # Server Actions
├── page.tsx          # Route page
└── types.ts          # Feature-specific types
```

### 4.3 State Management

| State Type | Technology | Scope |
|-----------|-----------|-------|
| Server State | TanStack Query | Dashboard data fetching, caching, invalidation |
| Form State | React Hook Form + Zod | All forms (public + dashboard) |
| Client State | React useState/useReducer | UI state (modals, toggles) |
| Auth State | Better Auth hooks | Session, permissions |
| Analytics | Third-party scripts | User behavior tracking |

---

## 5. Data Flow Architecture

### 5.1 Request Flow

```
Browser → Cloudflare CDN → Vercel Edge → Next.js App Router
                                         ├── Server Component → Repository → DB
                                         ├── Route Handler → Repository → DB → JSON Response
                                         ├── Server Action → Validation → Repository → DB → Redirect/Response
                                         └── Client Component → TanStack Query → Route Handler → DB
```

### 5.2 Content Publishing Flow

```
Admin Dashboard → Publish Action → Status Update (draft→published)
                                  → Cache Invalidation (revalidateTag)
                                  → Search Index Update
                                  → CDN Purge
                                  → Serve Fresh Content
```

### 5.3 Lead Capture Flow

```
Visitor → Form Submit → Server Action → Zod Validation
                                       → Lead Creation (DB)
                                       → UTM Parameter Capture
                                       → Notification Dispatch
                                       → Analytics Event
                                       → Success Response
```

---

## 6. Background Job Architecture

### 6.1 Cloudflare Cron Triggers (1-minute interval)

| Job | Purpose | Key Operations |
|-----|---------|---------------|
| Content Scheduler | Scheduled content publishing | Check publish_at, update status, revalidate |
| Content Expirer | Content expiry management | Check expires_at, update status, revalidate |
| Search Indexer | Sync search_index table | Diff-based sync from content tables |
| Newsletter Dispatcher | Send scheduled campaigns | Fetch pending campaigns, dispatch via Resend, update status |
| Media Cleanup | Orphan media removal | Find unused media_assets, soft-delete |

### 6.2 Newsletter Dispatcher

**Trigger:** Cloudflare Cron Trigger (runs every 1 minute)  
**Schedule:** Campaigns define `scheduled_at` timestamp  
**Input:** `campaigns` table — rows where `status = 'scheduled'` AND `scheduled_at <= NOW()`  
**Output:** Emails sent via Resend API, campaign status updated to `sending` → `sent`  
**Failure Handling:** 
- Individual email failures logged, campaign remains `sending`
- 3 retries per failed email with exponential backoff
- After 3 failures, email marked as `failed` in campaign log
**Monitoring:** Campaign metrics tracked in `campaign_analytics` table

### 6.3 Media Cleanup Job

**Trigger:** Cloudflare Cron Trigger (runs daily)  
**Schedule:** Daily at 03:00 UTC  
**Input:** `media_assets` table — scan for orphaned records  
**Orphan Detection:** Media assets not referenced in any content table's image/content fields  
**Output:** Orphans soft-deleted (`deleted_at` set), actual files moved to `r2://uploads/.trash/`  
**Retention:** Trash files auto-deleted after 30 days  
**Failure Handling:** Job logs each orphan with status; failures reported to Sentry  
**Monitoring:** Orphan count, bytes freed, error rate tracked in platform monitoring

---

## 7. External Integration Architecture

### 7.1 Integration Pattern

All external integrations follow a consistent pattern:
1. **Abstraction layer** — Service class in a dedicated package
2. **Configuration** — Environment variables validated at startup
3. **Error handling** — Retry with exponential backoff, circuit breaker
4. **Logging** — Structured logging for all external calls
5. **Fallback** — Graceful degradation when external service is unavailable

### 7.2 Integration Map

| Service | Package | Integration Type | Fallback Behavior |
|---------|---------|-----------------|-------------------|
| Supabase PostgreSQL | `database` | Direct (via Drizzle) | Read from cache |
| Cloudflare R2 | `cms`/`media` | S3-compatible API | Queue for retry |
| Resend | `email` | REST API | Queue for retry |
| Sentry | Root app | SDK | No-op in dev |
| Telegram | `notifications` | REST API | Log + queue |
| WhatsApp | `notifications` | REST API | Log + queue |
| Cloudflare Analytics | `analytics` | Edge functions | No-op on failure |
| Microsoft Clarity | Root app | Script tag | Silent fail |
| Umami | `analytics` | Script tag | Silent fail |

---

## 8. Caching Strategy

### Layer 1: Cloudflare CDN
- Static assets (images, fonts, JS bundles): Long-lived cache (1 year)
- HTML pages: Short TTL (60s) with stale-while-revalidate
- API responses: Cache by URL, invalidated on content change

### Layer 2: Next.js Cache
- Data Cache: `next/cache` with tag-based invalidation
- Full Route Cache: Static pages revalidated on demand
- Router Cache: Client-side navigation cache (30s default)

### Layer 3: TanStack Query Cache
- Dashboard data: 5-minute stale time, background refetch
- Mutations trigger immediate cache invalidation
- Optimistic updates for fast UX

---

## 9. Cross-Cutting Concerns

| Concern | Approach | Enforcement |
|---------|----------|-------------|
| Logging | Structured JSON via `pino` or Next.js built-in | Repository pattern wrapper |
| Error Handling | Global ErrorBoundary, typed error responses | ESLint rules, review |
| Performance | LCP < 2s, CLS < 0.05, INP < 150ms | Lighthouse CI in pipeline |
| Accessibility | WCAG AA, keyboard nav, screen reader | aXe in CI |
| Security | OWASP Top 10, input validation, RBAC | Dependency scanning |
| Monitoring | Sentry errors, custom metrics dashboard | PR checklist |

---

## 10. Dependencies

### 10.1 Cron Schedule Recommendations

| Job | Cron Expression | Schedule | Rationale |
|-----|-----------------|----------|-----------|
| Content Scheduler | `* * * * *` | Every 1 minute | Precise publishing — content must go live at exact `publish_at` time |
| Content Expirer | `* * * * *` | Every 1 minute | Precise expiry — content must come down at exact `expires_at` time |
| Search Indexer | `*/5 * * * *` | Every 5 minutes | Near-real-time index sync; 5-min delay acceptable for search freshness |
| Newsletter Dispatcher | `* * * * *` | Every 1 minute | Campaigns may be time-sensitive; 1-min granularity required |
| Media Cleanup | `0 3 * * *` | Daily 03:00 UTC | Low-traffic window; non-urgent; daily cadence sufficient |
| Notification Retry | `*/5 * * * *` | Every 5 minutes | Failed notifications retried in batches; 5-min interval prevents API rate-limit hits |
| Backup Notification | `0 2 * * *` | Daily 02:00 UTC | Before media cleanup; ensures backup state is clean |

**Implementation:** Cloudflare Cron Triggers. Each job endpoint (`POST /api/cron/{job}`) authenticated via `CRON_SECRET` header. Jobs must complete within timeout; overlapping executions prevented via PostgreSQL advisory lock.

### 10.2 Sentry Integration

| Aspect | Specification |
|--------|---------------|
| Package | `@sentry/nextjs` — installed in each app (`apps/web`, `apps/dashboard`, `apps/portal`) |
| DSN | Per-environment variable (`NEXT_PUBLIC_SENTRY_DSN`) |
| Initialization | `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` per app |
| Error Capture | Global error boundary in each app; API route wrapper; repository-level catch |
| Performance Tracing | Enabled with 0.1 sampling rate in production, 1.0 in dev/staging |
| Release Tracking | CI pipeline sets `SENTRY_RELEASE` via `sentry-cli` or Vercel integration |
| User Context | `Sentry.setUser({ id, email })` on auth — **never** include PII beyond email |
| Breadcrumbs | HTTP requests, database queries (manually), auth events, form submissions |
| Ignored Errors | AbortController errors, known bot crawlers, 404s on non-existent routes |
| Alert Rules | Errors > 10/min in production → Slack notification; > 50/min → PagerDuty (future) |
| Cron Monitoring | Sentry Cron Monitor for each background job — detects missed or delayed runs |

**Implementation in each app:**
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [Sentry.browserTracingIntegration()],
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
});
```

### 10.3 Logging Requirements

| Property | Specification |
|----------|---------------|
| Library | `pino` (server-side) — configured in each app's `logger.ts` |
| Format | Structured JSON — every log entry has `timestamp`, `level`, `message`, `requestId` |
| Levels | `error`, `warn`, `info`, `debug` (debug suppressed in production) |
| Request ID | Generated per request via Next.js `Request` header or middleware; propagated to all logs |
| Repository Logging | Every DB query logged at `debug` with duration; errors logged at `error` |
| External Service Logging | Every outbound API call logged with method, URL, status, duration |
| Background Job Logging | Job start, items processed, items failed, duration logged at `info` |
| Audit Trail | Security-sensitive actions logged to `audit_logs` table in DB (separate from app logs) |
| Log Shipping | Vercel logs → Vercel dashboard (retention 7d). Future: self-hosted Grafana/Loki |
| PII Redaction | Email, phone, IP addresses redacted from log output via `pino` redact option |
| Client-Side Logging | Minimal — only `console.error` for unhandled exceptions (captured by Sentry) |

**Logger configuration:**
```typescript
// packages/shared/src/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: ['email', 'phone', 'ip', 'password', 'token', 'authorization'],
    censor: '[REDACTED]',
  },
  formatters: {
    level(label) { return { level: label }; },
  },
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, requestId: req.headers['x-request-id'] }),
    err: pino.stdSerializers.err,
  },
});
```

---

## 11. Architecture Decisions

### ADR-001: Monolith over Microservices
- **Context:** Platform serves < 1M monthly visitors
- **Decision:** Single Next.js deployment with modular packages
- **Rationale:** Simpler deployment, shared type safety, no network overhead
- **Trade-off:** Vertical scaling only; re-evaluate at 1M+ visitors

### ADR-002: Repository Pattern
- **Context:** Database provider may change (Supabase → self-hosted)
- **Decision:** All database access through repositories
- **Rationale:** Vendor lock-in avoidance, testable data layer
- **Trade-off:** Additional abstraction layer

### ADR-003: Separate Portal App
- **Context:** Client portal requires independent auth and styling
- **Decision:** Separate Next.js app with shared packages
- **Rationale:** Isolated security boundary, light-mode-only, different UX
- **Trade-off:** Duplicated build overhead
