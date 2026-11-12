# Implementation Order

> **PRD Reference:** [PRD.md](../PRD.md) — AI Agent Execution Plan (§ Execution Stages), Launch Strategy  
> **Status:** Approved  
> **Version:** 1.0

---

## 1. Implementation Overview

The platform is built across 19 sequential stages. Each stage produces a working, deployable increment. Stages are ordered to minimize dependencies: foundations before features, infrastructure before content, data before UI.

| Phase | Stages | Timeline Estimate | Dependencies |
|-------|--------|-------------------|--------------|
| Foundation | 01-05 | Week 1-2 | None |
| CMS + Media | 06-07 | Week 3-4 | Stage 05 |
| CRM + Forms | 08-09 | Week 5 | Stage 02, 03 |
| Operations | 10-12 | Week 6-8 | Stage 02, 03, 07, 08 |
| Public Website | 13 | Week 8-9 | Stage 04, 06 |
| Search + SEO | 14-15 | Week 9-10 | Stage 06, 13 |
| Quality | 16-18 | Week 10-11 | All prior |
| Launch | 19 | Week 12 | All prior |

**Total estimated duration: 12 weeks with single engineer.** Parallelization possible with team expansion.

---

## 2. Stage Details

### Stage 01 — Project Foundation

| Property | Value |
|----------|-------|
| Objective | Create monorepo foundation |
| Estimated Complexity | Medium |
| Estimated Risk | Low |
| Dependencies | None |

**Deliverables:**
- Turborepo monorepo with `apps/` and `packages/` structure
- TypeScript (strict mode) across all packages
- ESLint + Prettier configuration
- pnpm workspace setup
- Git configuration + `.gitignore`
- `.env.example` with all required variables
- GitHub Actions workflow (lint, typecheck, build)
- Sentry setup (DSN, error boundary, basic config)
- Environment validation script

**Acceptance Criteria:**
- `pnpm install` succeeds
- `pnpm build` succeeds
- `pnpm lint` passes with zero errors
- `pnpm typecheck` passes with zero errors
- Sentry test event captured in dashboard

**Exit Criteria:** Clean, building monorepo with CI passing.

---

### Stage 02 — Database Foundation

| Property | Value |
|----------|-------|
| Objective | Establish complete data layer |
| Estimated Complexity | High |
| Estimated Risk | Medium |
| Dependencies | Stage 01 |

**Deliverables:**
- Drizzle ORM configuration with Supabase PostgreSQL connection
- All database schemas (~60 tables across 18 domains, see DATA_MODEL.md)
- Migration generation and application scripts
- Seed data scripts for development
- Repository Pattern implementation for all domains
- Basic repository unit tests

**Key Tables:** users, roles, permissions, person_profiles + all extension tables, all content tables, all CRM tables, all freelance tables, all event tables, all finance tables, all portal tables, all proposal tables, all newsletter tables, all search tables, all media tables, all system tables

**Acceptance Criteria:**
- All migrations execute without errors
- Seed data populates correctly
- Repository CRUD operations work for each domain
- `db:push`, `db:migrate`, `db:seed` commands function correctly
- Tests pass for repository layer

**Exit Criteria:** Complete database layer operational with all entities.

---

### Stage 03 — Authentication & RBAC

| Property | Value |
|----------|-------|
| Objective | Implement security layer |
| Estimated Complexity | Medium |
| Estimated Risk | Medium |
| Dependencies | Stage 02 |

**Deliverables:**
- Better Auth configuration with Supabase adapter
- Email + Password authentication flow
- Session management (create, validate, refresh, revoke)
- RBAC system: roles, permissions, role-permission assignment
- 10 roles implemented (Super Admin through Client)
- Permission checking middleware for API routes
- Route protection for admin dashboard
- Auth UI components (login page, logout, session indicator)

**Acceptance Criteria:**
- User registration and login work
- Session persists across page reloads
- Role-based access restrictions function correctly
- Permission checks block unauthorized access
- Protected routes redirect unauthenticated users
- Logout clears session

**Exit Criteria:** Security layer complete with authentication and authorization.

---

### Stage 04 — Design System

| Property | Value |
|----------|-------|
| Objective | Create reusable UI foundation |
| Estimated Complexity | Medium |
| Estimated Risk | Low |
| Dependencies | Stage 01 |

**Deliverables:**
- `packages/ui` with all shadcn/ui primitives
- CSS custom properties for design tokens (colors, typography, spacing, shadows)
- Core components: Button, Input, Select, Card, Dialog, Dropdown, Tabs, Badge, Avatar, Skeleton, Toast, Tooltip, Sheet
- Form components: FormField, FormLabel, FormError
- Layout components: Container, Grid
- Dark/light theme switching
- `prefers-reduced-motion` compliance
- All component states (default, hover, focus, active, disabled, loading)

**Acceptance Criteria:**
- All components render correctly in Storybook or equivalent
- Responsive behavior works at all breakpoints
- Dark/light theme toggles correctly
- Keyboard navigation works on all interactive components
- Screen readers can navigate all components
- Reduced motion respected (instant transitions)

**Exit Criteria:** Reusable, accessible design system documented and functional.

---

### Stage 04A — Design Token Implementation

| Property | Value |
|----------|-------|
| Objective | Implement CSS custom properties and design tokens |
| Estimated Complexity | Low |
| Estimated Risk | Low |
| Dependencies | Stage 04 |

**Deliverables:**
- All CSS variables from Design System specification (colors, type scale, spacing, radius, shadows, motion)
- Theme switch mechanism (dark/light)
- Font loading via `next/font` (DM Sans, Noto Naskh Arabic, JetBrains Mono)
- Component state classes

**Acceptance Criteria:**
- All tokens match PRD Design System spec
- Dark/light themes toggle correctly
- Reduced motion respected
- Fonts load without layout shift (CLS < 0.05)

**Exit Criteria:** Design tokens fully operational across all apps.

---

### Stage 05 — Dashboard Foundation

| Property | Value |
|----------|-------|
| Objective | Create admin dashboard shell |
| Estimated Complexity | Medium |
| Estimated Risk | Low |
| Dependencies | Stage 03, Stage 04, Stage 04A |

**Deliverables:**
- Dashboard layout with sidebar (240px, collapsible to 64px)
- Top bar (56px) with breadcrumb, search trigger, notifications, user avatar
- TanStack Router configuration for client-side routing
- Navigation groups: Overview, Content, CRM, Operations, Portal, System
- Mobile-responsive sidebar (overlay with backdrop)
- Auth guard — redirects to login if not authenticated
- Dashboard home `/dashboard` with widget grid placeholder

**Acceptance Criteria:**
- All navigation links render and route correctly
- Sidebar collapses/expands correctly on desktop
- Mobile sidebar opens/closes with proper animation
- Unauthenticated users redirected to login
- Dashboard home renders with widget grid
- All interactive elements accessible via keyboard

**Exit Criteria:** Navigable, mobile-responsive dashboard shell with auth.

---

### Stage 06 — CMS Foundation

| Property | Value |
|----------|-------|
| Objective | Build content management system |
| Estimated Complexity | High |
| Estimated Risk | Medium |
| Dependencies | Stage 02, Stage 03, Stage 05 |

**Deliverables:**
- Pages Manager (CRUD, rich text editing, SEO fields)
- Homepage Manager (section ordering, show/hide, content editing, featured item selection)
- Blog Manager (posts, categories, tags, SEO, scheduling)
- Projects Manager (CRUD, technologies, galleries, SEO)
- Services Manager (CRUD, FAQs, reordering, SEO)
- SEO Manager (meta titles, descriptions, OG images, canonical URLs)
- Content status workflow (Draft → Review → Scheduled → Published → Archived)
- Content Scheduling Engine (publish_at, unpublish_at, expires_at)

**Acceptance Criteria:**
- Full CRUD operations work for all content types
- Rich text editor saves and renders correctly
- SEO fields persist and render in page metadata
- Content scheduling publishes/unpublishes at correct times
- Homepage section ordering persists
- Media integration works for content images
- Mobile responsive on dashboard

**Exit Criteria:** CMS fully operational for content management.

---

### Stage 07 — Media System

| Property | Value |
|----------|-------|
| Objective | Build media infrastructure |
| Estimated Complexity | Medium |
| Estimated Risk | Medium |
| Dependencies | Stage 02, Stage 03, Stage 05 |

**Deliverables:**
- Cloudflare R2 integration (upload, download, delete)
- Media library UI (grid view, folder navigation, multi-select)
- Image optimization pipeline (AVIF, WebP, JPEG — thumbnail, small, medium, large, original)
- File upload with validation (MIME type, size, extension)
- Media metadata management (filename, alt text, dimensions)
- Folder system (create, rename, delete)

**Acceptance Criteria:**
- Upload works for images, documents, audio, video
- Image variants generated for all configured sizes
- Files deliverable via CDN
- File type validation rejects invalid formats
- Media library renders with grid view and folder navigation
- Multi-select and batch delete work

**Exit Criteria:** Complete media system with CDN delivery.

---

### Stage 08 — CRM System

| Property | Value |
|----------|-------|
| Objective | Build lead management infrastructure |
| Estimated Complexity | High |
| Estimated Risk | Medium |
| Dependencies | Stage 02, Stage 03, Stage 05 |

**Deliverables:**
- Lead CRUD with full field set (name, email, phone, company, country, budget, timeline, etc.)
- Lead pipeline (New → Contacted → Qualified → Proposal Sent → Negotiation → Won → Lost → Archived)
- Lead activities timeline (every action logged)
- Lead notes (internal, not publicly visible)
- Lead assignment to users
- UTM tracking on all lead sources
- SLA tracking (15-minute default, warning/breached states)
- Follow-up queue (leads with follow_up_date due or overdue)
- Lead conversion to project/event
- Dashboard metrics (total, qualified, won, conversion rate, lead source breakdown)

**Acceptance Criteria:**
- Lead creation works from all form sources
- Status changes log activities correctly
- Pipeline stages enforce correct ordering
- UTM parameters captured and stored
- SLA breaches trigger correct status
- Follow-up queue shows correct leads
- Dashboard metrics match database state

**Exit Criteria:** CRM operational with pipeline, tracking, and metrics.

---

### Stage 09 — Forms Builder

| Property | Value |
|----------|-------|
| Objective | Build dynamic forms platform |
| Estimated Complexity | Medium |
| Estimated Risk | Low |
| Dependencies | Stage 02, Stage 03, Stage 05, Stage 08 |

**Deliverables:**
- Dynamic form builder (add, edit, reorder fields)
- Field types: text, email, phone, textarea, select, radio, checkbox, date, file, URL, number
- Form preview modal
- Form submission handling with validation
- Auto-creation of lead from form submission
- Form analytics (views, starts, submissions, abandonments, conversion rate)
- Spam protection (honeypot, rate limiting, time check)
- Public form rendering (embed-friendly)
- File upload support in forms

**Acceptance Criteria:**
- Forms render correctly with all defined field types
- Validation rules work for each field type
- File uploads within forms process correctly
- Submissions create lead records automatically
- Spam protection blocks rapid submissions
- Form analytics reflect actual visitor behavior

**Exit Criteria:** Dynamic forms system fully operational.

---

### Stage 10 — Freelance Project Management

| Property | Value |
|----------|-------|
| Objective | Build project lifecycle system |
| Estimated Complexity | High |
| Estimated Risk | Medium |
| Dependencies | Stage 02, Stage 03, Stage 05, Stage 07, Stage 08 |

**Deliverables:**
- Project CRUD with full field set
- Project categories management (CRUD from settings)
- Milestone management (CRUD, status tracking)
- Deliverable management (upload, client feedback, status)
- Activity log (automatic logging of every status transition)
- Team assignment (multiple users per project)
- Subcontractor notes field
- Project detail page with tabs (Overview, Milestones, Deliverables, Finance, Portal, Activity)
- Project list with filters (status, category, client, date range)
- Quick status change actions
- Status flow: Lead Won → Project Created → In Progress → Under Review → Revision Requested → Completed → Archived

**Acceptance Criteria:**
- Project CRUD works with all fields
- Milestone creation and status updates function correctly
- Deliverable upload works with file storage
- Activity log entries created on every action
- Project list filters work for all filter types
- Status transitions follow the defined lifecycle
- Finance tab shows correct project summary

**Exit Criteria:** Freelance project management fully operational.

---

### Stage 11 — Finance System

| Property | Value |
|----------|-------|
| Objective | Build income, expense, and invoice tracking |
| Estimated Complexity | High |
| Estimated Risk | Medium |
| Dependencies | Stage 02, Stage 03, Stage 05, Stage 07, Stage 10 |

**Deliverables:**
- Payment methods CRUD (from Settings)
- Payment logging with source linking (project or event)
- Expense logging with category and source linking
- Invoice generation with auto-numbering (INV-YYYY-NNN)
- PDF invoice generation stored to R2
- Per-project/event finance summary (agreed, received, pending, expenses, net profit)
- Global finance dashboard (income, expenses, net profit, monthly trend, top clients, pending receivables)
- Currency support

**Acceptance Criteria:**
- Payment method CRUD works
- Payment log entries link correctly to projects/events
- Expense entries link correctly to sources
- Invoice generates correct PDF with line items
- Invoice PDF downloadable from R2
- Per-project finance summary calculates correctly
- Global dashboard metrics are accurate
- Currency formatting works correctly

**Exit Criteria:** Finance system fully operational.

---

### Stage 12 — Artist Events + Client Portal + Proposals + Notifications

| Property | Value |
|----------|-------|
| Objective | Build remaining operational modules |
| Estimated Complexity | Very High |
| Estimated Risk | High |
| Dependencies | Stage 02, Stage 03, Stage 05, Stage 07, Stage 08, Stage 10, Stage 11 |

#### Part A: Artist Events

**Deliverables:**
- Event CRUD with lifecycle status transitions
- Event categories management (CRUD from settings)
- Event logistics linked to events
- Event activity log
- Availability calendar management
- Public schedule page `/artist/schedule`
- Booking form with availability calendar (unavailable dates blocked)
- Finance integration (event fees via Finance System)

#### Part B: Client Portal

**Deliverables:**
- Separate `apps/portal` Next.js app
- Token-based authentication (portal_sessions)
- Portal login page (token from URL or password)
- Tab-based layout: Overview, Milestones, Deliverables, Messages, Payments
- Deliverable approval/revision request actions
- Message threading between client and admin
- Payment summary with invoice download
- Light mode only, mobile-first

#### Part C: Proposals

**Deliverables:**
- Proposal templates CRUD with rich text editor and variable placeholders
- Proposal document generation with variable substitution
- PDF generation stored to R2
- Proposal status workflow (draft → sent → accepted → rejected)
- Auto-create project from accepted proposal

#### Part D: Notifications

**Deliverables:**
- All 12 notification triggers wired (see PRD Notification System)
- Telegram and WhatsApp webhook dispatch
- Per-trigger admin preference settings (from Settings → Notifications)
- Email dispatch via Resend for configurable triggers

**Acceptance Criteria:**
- All event lifecycle transitions work with activity logging
- Availability calendar blocks confirmed dates in booking form
- Public schedule shows only public confirmed/completed events
- Portal login works with token
- All portal tabs render correct project data
- Client can approve and request revision on deliverables
- Portal messages send and receive correctly
- Proposal template variables substitute correctly
- Generated PDF stores to R2 and downloads
- Accepted proposal creates project record
- All notification triggers fire to configured channels

**Exit Criteria:** Artist events, client portal, proposals, and notifications fully operational.

---

### Stage 13 — Public Website

| Property | Value |
|----------|-------|
| Objective | Build public-facing platform |
| Estimated Complexity | High |
| Estimated Risk | High |
| Dependencies | Stage 04, Stage 04A, Stage 06, Stage 10, Stage 12 |

**Deliverables:**
- Homepage with all 11 sections (Hero through Final CTA)
- Developer Profile page
- Entrepreneur Profile page
- Artist Profile page (with release library, streaming platforms, lyrics)
- About page
- Services listing and detail pages
- Projects listing and detail pages
- Blog listing, category/tag archives, and detail pages
- Case studies listing and detail pages
- Releases listing and detail pages
- Ventures listing and detail pages
- Resources listing and detail pages
- Media mentions listing and detail pages
- Timeline page
- Press kit page
- Book/booking hub page
- Contact page (with form)
- Newsletter signup page
- Global navigation (desktop + mobile)
- Footer with all sections
- SEO metadata on every page
- Announcement bar
- Identity switcher (Developer, Entrepreneur, Artist)

**Acceptance Criteria:**
- All pages render at all breakpoints (mobile, tablet, desktop)
- Homepage sections match PRD specification
- Navigation works correctly on mobile and desktop
- All SEO metadata renders correctly in `<head>`
- Identity switcher navigates correctly between profiles
- Contact form submits and creates lead
- Newsletter signup works
- Responsive images load with correct variants
- Performance: LCP < 2s, CLS < 0.05

**Exit Criteria:** Complete public website with all pages.

---

### Stage 14 — Search System

| Property | Value |
|----------|-------|
| Objective | Build search infrastructure |
| Estimated Complexity | Medium |
| Estimated Risk | Low |
| Dependencies | Stage 02, Stage 06, Stage 13 |

**Deliverables:**
- `search_index` table (indexed content across all entity types)
- PostgreSQL Full Text Search implementation with tsvector
- Search API endpoint with filtering (content type, category, tag, date)
- Search UI page with instant results, suggestions, highlights
- Search synonyms table and management UI
- Search reindex cron job
- Content update → search index sync

**Acceptance Criteria:**
- Search returns relevant results across all content types
- Filters narrow results correctly
- Search highlights match terms in results
- Synonyms expand search correctly
- Index stays synchronized with content changes
- Performance: search response < 500ms

**Exit Criteria:** Search system complete with index and UI.

---

### Stage 15 — SEO Engine

| Property | Value |
|----------|-------|
| Objective | Implement SEO platform |
| Estimated Complexity | Medium |
| Estimated Risk | Low |
| Dependencies | Stage 02, Stage 06, Stage 13 |

**Deliverables:**
- Metadata engine (auto-generated meta titles, descriptions, OG images)
- Schema.org structured data generation (Person, Organization, ProfessionalService, Article, MusicRecording, BreadcrumbList, FAQPage, WebSite, SearchAction)
- Automatic sitemap generation
- Robots.txt management (dashboard-controlled)
- Redirect manager (301/302, slug history, bulk import)
- Broken link monitoring
- SEO dashboard (audit scores, coverage metrics)
- Canonical URL management

**Acceptance Criteria:**
- All pages have correct meta title and description
- JSON-LD schema validates on Google Rich Results Test
- Sitemap includes all content types and is valid XML
- Redirects function correctly (301/302)
- Robots.txt reflects dashboard settings
- Structured data covers all configured schema types

**Exit Criteria:** SEO engine producing valid markup and files.

---

### Stage 16 — Analytics & Monitoring

| Property | Value |
|----------|-------|
| Objective | Implement visibility layer |
| Estimated Complexity | Low |
| Estimated Risk | Low |
| Dependencies | Stage 05, Stage 08, Stage 13 |

**Deliverables:**
- Cloudflare Analytics integration (edge-level traffic data)
- Microsoft Clarity integration (session recording, heatmaps)
- Umami analytics integration (privacy-focused)
- Dashboard reporting with key metrics per module
- Custom event tracking (form submissions, lead captures, content views)
- Sentry performance monitoring for critical routes

**Acceptance Criteria:**
- Analytics scripts load correctly (deferred, non-blocking)
- Clarity recordings capture sessions correctly
- Umami tracks page views correctly
- Dashboard reports show accurate metric data
- Sentry traces capture API route performance

**Exit Criteria:** Monitoring and analytics operational.

---

### Stage 17 — Testing

| Property | Value |
|----------|-------|
| Objective | Verify platform quality |
| Estimated Complexity | Medium |
| Estimated Risk | Medium |
| Dependencies | All prior stages |

**Deliverables:**
- Unit tests for all business logic, repositories, validators, utilities
- Integration tests for all API endpoints
- E2E tests for critical flows (Playwright): homepage, contact form, booking, newsletter, login, lead management, content publishing
- Accessibility tests with aXe (all public pages, key dashboard pages)
- SEO validation tests (meta tags, structured data, sitemap)
- Mobile testing across breakpoints
- Performance regression tests

**Acceptance Criteria:**
- All unit tests pass (>80% coverage)
- Integration tests pass for all critical API endpoints
- E2E tests pass for all critical user flows
- No critical accessibility violations
- Lighthouse scores meet targets (Performance 95+, Accessibility 95+, SEO 100)
- Mobile rendering verified for all pages

**Exit Criteria:** Quality verified through automated testing.

---

### Stage 18 — Optimization

| Property | Value |
|----------|-------|
| Objective | Achieve production-grade performance |
| Estimated Complexity | Medium |
| Estimated Risk | Low |
| Dependencies | All prior stages |

**Deliverables:**
- Core Web Vitals optimization (LCP, CLS, INP)
- Bundle size optimization (code splitting, tree shaking, dynamic imports)
- Image optimization pass (all images use next/image, proper sizes)
- Caching strategy implementation (CDN, Next.js, React Query)
- Accessibility improvements (WCAG AA compliance pass)
- Security hardening (CSP headers, rate limiting review, input sanitization)
- Performance budget enforcement in CI

**Acceptance Criteria:**
- LCP < 2 seconds on production
- CLS < 0.05
- INP < 150ms
- Homepage critical JS bundle < 150KB
- Lighthouse Performance 95+, Accessibility 95+, Best Practices 95+
- No critical security vulnerabilities
- CSP headers present and valid
- All animations respect reduced motion

**Exit Criteria:** Platform optimized for production release.

---

### Stage 19 — Production Launch

| Property | Value |
|----------|-------|
| Objective | Release platform |
| Estimated Complexity | Low |
| Estimated Risk | Medium |
| Dependencies | All prior stages |

**Deliverables:**
- Production deployment to Vercel
- Production database migration (Supabase)
- CDN configuration (Cloudflare)
- DNS configuration (domain pointed to Vercel + Cloudflare)
- Sentry release tracking
- Smoke test of all critical flows
- Monitoring dashboard verification
- Deployment runbook finalization
- Rollback procedure verification

**Acceptance Criteria:**
- Production deployment successful
- All critical routes return HTTP 200
- Contact form submits and creates lead
- Newsletter subscribe flow works end-to-end
- Dashboard login works
- Content publishing works
- CDN serving cached assets
- Sentry capturing errors
- Rollback tested and confirmed working

**Exit Criteria:** Platform live and monitored on production.

---

## 3. Cross-Cutting Dependencies

### 3.1 Cron Schedule Recommendations (Per-Stage)

| Stage | Cron Job Introduced | Schedule | When to Deploy | Precondition |
|-------|-------------------|----------|----------------|--------------|
| Stage 06 — CMS Foundation | Content Scheduler | `* * * * *` | After Stage 06 deployed | `posts` table has `publish_at`/`expires_at` columns with indexes |
| Stage 06 — CMS Foundation | Content Expirer | `* * * * *` | After Stage 06 deployed | Same as above |
| Stage 07 — Media System | Media Cleanup | `0 3 * * *` | After Stage 07 deployed | `media_assets` table populated, R2 integration live |
| Stage 10 — Freelance Projects | Notification Retry | `*/5 * * * *` | After Stage 10 deployed | Notification triggers wired in Stage 12 |
| Stage 11 — Finance System | Invoice Reminder | `0 9 * * *` | After Stage 11 deployed | Overdue payment logic implemented |
| Stage 12 — Artist Events | Event Reminder | `0 8 * * *` | After Stage 12 deployed | Artist events table populated |
| Stage 12 — Notifications | Newsletter Dispatcher | `* * * * *` | After Stage 12 deployed | Resend integration verified, campaign table seeded |
| Stage 14 — Search System | Search Indexer | `*/5 * * * *` | After Stage 14 deployed | `search_index` table migrated, FTS vector populated |

**Deployment order for cron jobs:**
1. Deploy app code with cron endpoint
2. Verify endpoint returns 200 with valid CRON_SECRET
3. Register cron trigger in Cloudflare Dashboard
4. Monitor first 10 executions for errors
5. Add Sentry Cron Monitor for alerting

### 3.2 Sentry Integration (Per-Stage)

| Stage | Sentry Component | Configuration | Acceptance |
|-------|-----------------|---------------|------------|
| Stage 01 — Foundation | DSN, basic setup, error boundary | `sentry.client.config.ts`, `sentry.server.config.ts` | Test event captured in Sentry dashboard |
| Stage 02 — Database | Repository error capture | `Sentry.captureException` in all repositories | Repository errors appear in Sentry |
| Stage 03 — Auth | Auth event tracking | `Sentry.setUser` on login, breadcrumbs on auth events | Auth failures captured |
| Stage 04 — Design System | Error boundary in UI package | Global `ErrorBoundary` component | Component render errors captured |
| Stage 05 — Dashboard | Dashboard error boundary | Dashboard-specific boundary with fallback UI | Dashboard errors captured |
| Stage 06 — CMS | CMS operation tracking | Content CRUD performance tracing | Slow CMS operations tracked |
| Stage 08 — CRM | Lead operation tracking | Lead creation, status change events | CRM errors captured |
| Stage 10-12 — Operations | Business logic error capture | Project, event, finance operation errors | All operation errors captured |
| Stage 13 — Public Website | Web-app error boundary, page-level tracing | LCP/INP/CLS metrics via Sentry | Web vitals tracked |
| Stage 16 — Analytics | Sentry performance monitoring | Route handler traces, sample rate 0.1 | Traces visible in Sentry Performance |
| Stage 18 — Optimization | Slow query detection, bundle size tracking | Performance regression alerts | Sentry alerts configured |
| Stage 19 — Production | Release tracking, Cron Monitors | Release tag set, all cron jobs monitored | Cron Monitor green for all jobs |

### 3.3 Logging Requirements (Per-Stage)

| Stage | Logging Implementation | Level | Key Events to Log |
|-------|----------------------|-------|-------------------|
| Stage 01 | `packages/shared/logger.ts` with pino | debug (dev), info (prod) | App startup, env validation, build info |
| Stage 02 | Repository logging wrapper | debug | Query execution, migration steps, seed counts |
| Stage 03 | Auth event logging | info | Login, logout, failed login, permission denied |
| Stage 04 | Component mount logging (debug) | debug | Component lifecycle (dev only) |
| Stage 05 | Dashboard navigation logging | info | Route changes, sidebar toggle, page load |
| Stage 06 | Content operation logging | info | Content create, update, publish, archive, schedule |
| Stage 07 | Media operation logging | info | Upload, variant generation, delete, folder create |
| Stage 08 | CRM operation logging | info | Lead create, status change, assignment, SLA breach |
| Stage 09 | Form submission logging | info | Form view, start, submit, abandon, spam block |
| Stage 10 | Project operation logging | info | Project create, milestone update, deliverable upload |
| Stage 11 | Finance operation logging | warn (high value) | Payment log, invoice create, expense record |
| Stage 12 | Event/Portal/Proposal logging | info | Booking, portal login, proposal accept, notification send |
| Stage 13 | Page view logging | debug | Page render, navigation, form interaction |
| Stage 14 | Search query logging | debug | Search terms, result count, response time |
| Stage 15 | SEO operation logging | info | Sitemap generation, redirect create, reindex trigger |
| Stage 16 | Analytics event logging | info | Analytics init, event capture, script load |
| Stage 17 | Test execution logging | info | Test suite start, pass, fail, coverage |
| Stage 18 | Optimization event logging | warn | Caching miss, bundle size warning, slow render |
| Stage 19 | Production verification logging | info | Deploy success, smoke test results, monitoring init |

**Logging setup at each stage: addition, not replacement.** The Stage 01 logger is extended with domain-specific log events. Logging must never be removed or downgraded in later stages.

---

## 4. Critical Path Dependencies

```
Stage 01 ─── Stage 02 ─── Stage 03 ─── Stage 05 ─── Stage 06 ─── Stage 13 ─── Stage 14 ─── Stage 15
                  │            │            │              │                                   │
                  │            │            ├── Stage 07 ──┤                                   │
                  │            │            │              ├── Stage 08 ─── Stage 09 ──────────┤
                  │            │            │              │                                   │
                  │            │            │              ├── Stage 10 ─── Stage 11 ──────────┘
                  │            │            │              │       │
                  │            │            │              │       └── Stage 12 ───────────────
                  │            │            │              │
                  │            │            └── Stage 04 ──┤
                  │            │                           │
                  │            │                           └── Stage 04A
                  │            │
                  └────────────┴──────────────────────────────────── Stage 16
                                                                     Stage 17 (all)
                                                                     Stage 18 (all)
                                                                     Stage 19 (all)
```

---

## 5. Risk Assessment

| Stage | Risk | Mitigation |
|-------|------|------------|
| 02 (Database) | Schema size (60+ tables) | Batch by domain, validate incrementally |
| 10 (Freelance) | Integration complexity (CRM, Finance, Media) | Clear interface contracts, test early |
| 12 (Portal + Events + Proposals) | Scope bundling (4 subsystems) | Build sequentially within stage |
| 13 (Public Website) | Content volume (20+ page types) | Reusable section components, templates |
| 17 (Testing) | Coverage breadth | Prioritize critical flows, expand iteratively |

---

## 6. Quality Gates

| Gate | Stage | Criteria |
|------|-------|----------|
| Foundation Review | End of Stage 05 | Monorepo builds, database migrated, auth works, dashboard renders |
| CMS Review | End of Stage 06 | All content CRUD functional, scheduling works |
| Feature Complete | End of Stage 12 | All modules operational — CMS, CRM, Finance, Freelance, Events, Portal, Proposals |
| Launch Review | End of Stage 18 | All tests pass, Lighthouse targets met, no critical bugs |
| Go/No-Go | Before Stage 19 | All acceptance criteria met, rollback verified, monitoring confirmed |
