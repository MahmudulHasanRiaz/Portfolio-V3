# Execution Masterplan

> **PRD Reference:** [PRD.md](../PRD.md) — AI Agent Execution Plan (§ Execution Stages)  
> **Architecture Reference:** [Architecture Package](../architecture/)  
> **Status:** Approved for Execution  
> **Version:** 1.0

---

## 1. Program Overview

| Property | Value |
|----------|-------|
| Program | Personal Brand OS Platform |
| Total Phases | 20 |
| Total Estimated Agent Sessions | 185-220 |
| Architecture Freeze | Active |
| Build Status | Approved |

### Phase Dependency Graph

```
Phase 01 ─── Phase 02 ─── Phase 03 ─── Phase 05 ─── Phase 06 ─── Phase 16
                │              │              │                        │
                │              │              ├── Phase 07            │
                │              │              │                       │
                │              │              ├── Phase 08 ─── Phase 09
                │              │              │                       │
                │              │              ├── Phase 10            │
                │              │              ├── Phase 11            │
                │              │              ├── Phase 12            │
                │              │              │                       │
                │              │              ├── Phase 13            │
                │              │              ├── Phase 14            │
                │              │              │                       │
                │              │              └── Phase 15            │
                │              │                                     │
                │              └── Phase 04                          │
                │                                                    │
                └────────────────────────────────────────────────────┤
                                                                     │
                           Phase 17 ─── Phase 18 ─── Phase 19 ─── Phase 20
```

---

## Phase 01 — Repository & Foundation

| Property | Value |
|----------|-------|
| Complexity | Medium |
| Risk Level | Low |
| Estimated Agent Sessions | 6-8 |
| Dependencies | None |

### Objectives
Establish the monorepo foundation, tooling configuration, CI/CD pipeline, and shared infrastructure that all subsequent phases depend on.

### Deliverables
- Turborepo monorepo with apps/ and packages/ structure
- TypeScript strict mode across all packages
- ESLint + Prettier configuration
- pnpm workspace with dependency management
- Git configuration + .gitignore
- .env.example with all required variables
- GitHub Actions CI workflow (lint, typecheck, build)
- Environment validation script
- Sentry DSN initialization

### Tasks & Subtasks

**T1.1 — Initialize Turborepo Monorepo**
- Scaffold Turborepo with pnpm
- Create directory structure: apps/{web,dashboard,portal,docs}, packages/{ui,auth,database,validation,seo,email,analytics,cms,crm,search,freelance,events,finance,portal,proposals,notifications,shared}, tooling/, scripts/, .github/
- Configure pnpm-workspace.yaml
- Set up root tsconfig.json with project references

**T1.2 — Configure TypeScript**
- Create tooling/typescript/base.json with strict mode
- Configure path aliases (@/ → packages/*)
- Add tsconfig per package extending base
- Verify strict mode enforcement

**T1.3 — Configure ESLint & Prettier**
- Create tooling/eslint/base config
- Create tooling/prettier config
- Add lint scripts to each package
- Verify lint passes with zero errors

**T1.4 — Configure GitHub Actions CI**
- Create .github/workflows/ci.yml (lint, typecheck, build)
- Create .github/workflows/deploy.yml (production deploy trigger)
- Create .github/workflows/preview.yml (staging deploy trigger)

**T1.5 — Set Up Environment Infrastructure**
- Create .env.example with all 29 variables
- Create packages/shared/src/env.ts with Zod validation
- Add env validation to app startup

**T1.6 — Initialize Sentry**
- Install @sentry/nextjs in each app
- Create sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts
- Create GlobalErrorBoundary component
- Verify test event captured in Sentry dashboard

### Acceptance Criteria
- `pnpm install` succeeds
- `pnpm build` succeeds across all packages
- `pnpm lint` passes with zero errors
- `pnpm typecheck` passes with zero errors
- Environment validation rejects missing variables
- Sentry test event captured

### Exit Criteria
Clean, building monorepo with CI pipeline passing.

---

## Phase 02 — Database & Drizzle

| Property | Value |
|----------|-------|
| Complexity | High |
| Risk Level | Medium |
| Estimated Agent Sessions | 10-14 |
| Dependencies | Phase 01 |

### Objectives
Establish complete data layer with all 72 database tables, migrations, seed data, and repository pattern implementation across all 18 domains.

### Deliverables
- Drizzle ORM configuration with Supabase PostgreSQL connection
- All 72 database schemas across 18 domains
- Migration generation and application scripts
- Seed data scripts for development
- Repository Pattern implementation for all domains
- Repository unit tests

### Tasks & Subtasks

**T2.1 — Configure Drizzle ORM**
- Install drizzle-orm, drizzle-kit, postgres.js or pg
- Create packages/database/src/connection.ts
- Configure drizzle.config.ts
- Set up migration directory structure

**T2.2 — Implement Identity Domain Schemas**
- Create schemas: users, roles, permissions, role_permissions, user_roles, sessions, accounts, verification_tokens, person_profiles, developer_profiles, entrepreneur_profiles, artist_profiles
- Define enums, relations, and indexes

**T2.3 — Implement Content Domain Schemas**
- Create schemas: pages, homepage_sections, services, service_faqs, projects, technologies, project_technologies, case_studies, posts, categories, tags, post_categories, post_tags, resources, media_mentions, faqs, testimonials
- Define polymorphic relationship helpers

**T2.4 — Implement Entrepreneur & Artist Schemas**
- Create schemas: ventures, products, venture_products, releases, release_platforms, release_lyrics

**T2.5 — Implement CRM Domain Schemas**
- Create schemas: leads, lead_activities, lead_notes, abandoned_leads, forms, form_fields, form_submissions, form_analytics

**T2.6 — Implement Freelance & Event Schemas**
- Create schemas: project_categories, projects_freelance, project_milestones, project_deliverables, project_activity_logs, event_categories, artist_events, event_logistics, event_activity_logs, artist_availability

**T2.7 — Implement Finance & Portal Schemas**
- Create schemas: payment_methods, finance_payments, finance_expenses, finance_invoices, portal_sessions, portal_messages

**T2.8 — Implement Proposal, Newsletter & Search Schemas**
- Create schemas: proposal_templates, proposal_documents, subscribers, subscriber_segments, subscriber_verifications, campaigns, search_index, search_synonyms

**T2.9 — Implement SEO, Media & System Schemas**
- Create schemas: seo_meta, slug_redirects, media_assets, media_folders, homepage_versions, settings, audit_logs, content_revisions, timeline_events, faqs

**T2.10 — Implement Repository Pattern**
- Create base repository class with common CRUD operations
- Implement repositories for each schema
- Add pagination, filtering, sorting utilities
- Add database error handling wrapper

**T2.11 — Create Seed Data**
- Create seed scripts for development data
- Seed: person_profiles, services, projects, blog posts, test leads, test projects

**T2.12 — Generate & Apply Migrations**
- Run drizzle-kit generate
- Review migration SQL
- Run drizzle-kit migrate
- Verify all tables created in database

### Acceptance Criteria
- All migrations execute without errors
- Seed data populates correctly
- Repository CRUD operations work for each domain
- db:push, db:migrate, db:seed commands function correctly
- Tests pass for repository layer

### Exit Criteria
Complete database layer operational with all 72 entities.

---

## Phase 03 — Authentication & RBAC

| Property | Value |
|----------|-------|
| Complexity | Medium |
| Risk Level | Medium |
| Estimated Agent Sessions | 6-8 |
| Dependencies | Phase 02 |

### Objectives
Implement full authentication and authorization layer with Better Auth, session management, role-based access control with 10 roles and 52 permissions.

### Deliverables
- Better Auth configuration with Supabase adapter
- Email + Password authentication
- Session management (create, validate, refresh, revoke)
- RBAC system: roles, permissions, role-permission assignment
- Permission checking middleware
- Route protection for dashboard
- Auth UI components

### Tasks & Subtasks

**T3.1 — Configure Better Auth**
- Install Better Auth with Supabase adapter
- Create packages/auth/src/index.ts
- Configure auth endpoints: login, logout, register, session
- Set up session cookie configuration

**T3.2 — Implement Authentication UI**
- Create login page in apps/dashboard
- Create logout button
- Create session indicator
- Handle auth errors (invalid credentials, expired session)

**T3.3 — Implement RBAC Infrastructure**
- Seed roles table with 10 roles
- Seed permissions table with 52 permissions
- Create role-permission mapping
- Create user-role assignment API

**T3.4 — Implement Permission Checking**
- Create middleware: requirePermission(permissionId)
- Create component: <Can permission="..."> wrapper
- Create usePermissions() hook
- Implement route protection for dashboard routes

**T3.5 — Implement Session Management**
- Session creation on login
- Session validation on every request
- Session revocation on logout
- Session expiry handling

### Acceptance Criteria
- User registration and login work
- Session persists across page reloads
- Role-based access restrictions function correctly
- Permission checks block unauthorized access
- Protected routes redirect unauthenticated users
- Logout clears session

### Exit Criteria
Security layer complete with authentication and authorization.

---

## Phase 04 — Shared Packages

| Property | Value |
|----------|-------|
| Complexity | Medium |
| Risk Level | Low |
| Estimated Agent Sessions | 8-10 |
| Dependencies | Phase 01, Phase 03 |

### Objectives
Build all shared packages providing reusable business logic, validation, UI components, and utilities consumed by all three apps.

### Deliverables
- packages/shared: types, constants, logger, utilities
- packages/validation: Zod schemas for all entities
- packages/ui: shadcn/ui components + design system
- packages/seo: metadata, schema.org, sitemap utilities
- packages/email: Resend integration, email templates
- packages/notifications: Telegram/WhatsApp dispatch
- packages/analytics: Cloudflare Analytics, Clarity, Umami

### Tasks & Subtasks

**T4.1 — Build Shared Package**
- Define shared types (Pagination, ApiResponse, EntityStatus, etc.)
- Create logger with pino (see SYSTEM_ARCHITECTURE §10.3)
- Create constants (status enums, role IDs, permission IDs)
- Create utility functions (date format, slug generation, etc.)

**T4.2 — Build Validation Package**
- Create Zod schemas for every entity (see DATA_MODEL.md)
- Create base schemas for pagination, API responses
- Export all schemas from index.ts

**T4.3 — Build UI Package (Design System)**
- Initialize shadcn/ui in packages/ui
- Implement CSS custom properties for all design tokens
- Create components: Button, Input, Select, Card, Dialog, Dropdown, Tabs, Badge, Avatar, Skeleton, Toast, Tooltip, Sheet
- Create form components: FormField, FormLabel, FormError
- Create data display: DataTable, StatusBadge, Timeline
- Create layout: Container, Section, Grid
- Implement dark/light theme switching
- Implement prefers-reduced-motion compliance
- Create ErrorBoundary component

**T4.4 — Build SEO Package**
- Create metadata generator (meta title, description, OG)
- Create schema.org structured data helpers
- Create sitemap generation utility
- Create canonical URL helper
- Create robots.txt generator

**T4.5 — Build Email Package**
- Create Resend client wrapper
- Create email template system
- Create email templates: welcome, verification, notification, invoice
- Add retry logic with exponential backoff

**T4.6 — Build Notifications Package**
- Create Telegram dispatcher
- Create WhatsApp dispatcher (webhook)
- Create notification router (per-trigger channel configuration)
- Add retry + failure handling

**T4.7 — Build Analytics Package**
- Cloudflare Analytics edge function wrapper
- Microsoft Clarity script loader
- Umami script loader
- Custom event tracking helper

### Acceptance Criteria
- All packages build successfully
- UI components render in all states
- Zod schemas validate correctly
- Email sending works (test with Resend)
- Notifications dispatch correctly
- SEO utilities generate valid metadata

### Exit Criteria
All shared packages functional and importable by apps.

---

## Phase 05 — Dashboard Foundation

| Property | Value |
|----------|-------|
| Complexity | Medium |
| Risk Level | Low |
| Estimated Agent Sessions | 6-8 |
| Dependencies | Phase 03, Phase 04 |

### Objectives
Create the admin dashboard shell with layout, navigation, routing, and auth guards.

### Deliverables
- Dashboard layout with sidebar (240px/64px collapsed)
- Top bar (56px) with breadcrumb, search, notifications, user avatar
- TanStack Router configuration
- Navigation groups: Overview, Content, CRM, Operations, Portal, System
- Mobile-responsive sidebar (overlay)
- Auth guard (redirect to login)
- Dashboard home `/dashboard` with widget grid placeholder

### Tasks & Subtasks

**T5.1 — Create Dashboard Layout**
- Create apps/dashboard app with Next.js App Router
- Implement sidebar component (240px expanded, 64px collapsed)
- Implement topbar component (56px)
- Implement content area with TanStack Router outlet

**T5.2 — Configure TanStack Router**
- Install TanStack Router
- Set up route definitions for all dashboard routes
- Configure lazy loading for feature routes

**T5.3 — Implement Navigation Groups**
- Overview: Dashboard Home
- Content: Blog, Projects, Services, Releases, Ventures, SEO
- CRM: Leads, Forms
- Operations: Freelance Projects, Events, Finance
- Portal: Client Portal management
- System: Media, Users, Settings

**T5.4 — Implement Auth Guard**
- Redirect to /login if unauthenticated
- Render sidebar/nav based on user permissions
- Handle auth loading state

**T5.5 — Create Dashboard Home**
- Implement widget grid (3-col → 2-col → 1-col responsive)
- Create placeholder widgets for all Daily Overview panels
- Add Quick Actions buttons

### Acceptance Criteria
- All navigation links render and route correctly
- Sidebar collapses/expands correctly on desktop
- Mobile sidebar opens with backdrop overlay
- Unauthenticated users redirected to login
- Dashboard home renders with widget grid
- All interactive elements keyboard-accessible

### Exit Criteria
Navigable, mobile-responsive dashboard shell with auth.

---

## Phase 06 — CMS Core

| Property | Value |
|----------|-------|
| Complexity | High |
| Risk Level | Medium |
| Estimated Agent Sessions | 12-16 |
| Dependencies | Phase 02, Phase 03, Phase 05 |

### Objectives
Build the core content management system including pages, blog, projects, services management with full CRUD, rich text editing, SEO fields, and content scheduling.

### Deliverables
- Pages Manager (CRUD, rich text, SEO)
- Homepage Manager (sections, ordering, featured items)
- Blog Manager (posts, categories, tags, scheduling)
- Projects Manager (CRUD, technologies, galleries)
- Services Manager (CRUD, FAQs, reordering)
- SEO Manager (meta titles, descriptions, OG images)
- Content status workflow engine
- Content scheduling engine (publish/unpublish/expire)

### Tasks & Subtasks

**T6.1 — Build Pages Manager**
- Create dashboard route, components, hooks, schemas
- Implement pages CRUD with rich text editor (Tiptap)
- Add SEO fields panel (meta title, description, OG image)
- Add status workflow (draft → published → archived)

**T6.2 — Build Homepage Manager**
- Create homepage section ordering (drag-and-drop)
- Create show/hide toggle per section
- Create content editing per section
- Create featured item selectors (projects, services, posts)
- Implement homepage versioning storage

**T6.3 — Build Blog Manager**
- Create posts CRUD with rich text editor
- Create categories CRUD
- Create tags CRUD
- Implement scheduling fields (publish_at, unpublish_at, expires_at)
- Create post listing with status filters, inline tag editor
- Create DataTable view

**T6.4 — Build Projects Manager**
- Create projects CRUD
- Create technologies CRUD
- Create project-technologies mapping
- Add gallery image management
- Add project links (live URL, source URL)

**T6.5 — Build Services Manager**
- Create services CRUD
- Create FAQs CRUD per service
- Implement drag-and-drop reordering

**T6.6 — Build SEO Manager**
- Create meta title/description/OG editor per entity
- Create canonical URL editor
- Create advanced SEO controls (indexable, follow_links, etc.)

**T6.7 — Implement Content Scheduling Engine**
- Create cron endpoint POST /api/cron/schedule
- Create cron endpoint POST /api/cron/expire
- Query scheduled content, update status, revalidate
- Add Sentry Cron Monitor for both jobs

**T6.8 — Implement Content Status Workflow**
- Define workflow state machine per entity type
- Create status transition API
- Add audit logging on status changes

### Acceptance Criteria
- Full CRUD operations for all content types
- Rich text editor saves and renders correctly
- SEO fields persist and render in page metadata
- Content scheduling publishes/unpublishes at correct times
- Homepage section ordering persists
- Media integration works for content images
- Mobile responsive on dashboard

### Exit Criteria
CMS fully operational for content management.

---

## Phase 07 — Media System

| Property | Value |
|----------|-------|
| Complexity | Medium |
| Risk Level | Medium |
| Estimated Agent Sessions | 6-8 |
| Dependencies | Phase 02, Phase 03, Phase 05 |

### Objectives
Build the media infrastructure with Cloudflare R2 integration, image optimization pipeline, and media library UI.

### Deliverables
- Cloudflare R2 integration (upload, download, delete)
- Media library UI (grid view, folders, multi-select)
- Image optimization pipeline (AVIF, WebP, JPEG variants)
- File upload validation (MIME, size, extension)
- Media metadata management
- Folder system

### Tasks & Subtasks

**T7.1 — Implement R2 Storage**
- Create S3-compatible client wrapper
- Implement upload with presigned URLs
- Implement download with CDN URLs
- Implement delete (soft + hard)

**T7.2 — Implement Image Optimization Pipeline**
- On upload: validate → compress → generate variants
- Variant sizes: thumbnail (150px), small (480px), medium (1024px), large (2048px), original
- Variant formats: AVIF, WebP, JPEG
- Store variant paths in media_assets.variants JSONB

**T7.3 — Build Media Library UI**
- Create grid view (masonry or uniform)
- Create folder navigation tree
- Implement multi-select with batch operations
- Implement drag-and-drop upload zone
- Create file metadata sidebar

**T7.4 — Implement File Validation**
- MIME type allowlist validation
- File size limits (images: 10MB, documents: 20MB, video: 200MB)
- Extension allowlist
- Malicious content scanning (basic)

**T7.5 — Implement Media Cleanup Job**
- Create cron endpoint POST /api/cron/media-cleanup
- Implement orphan detection (scan content table references)
- Move orphaned files to R2 .trash/ prefix
- Soft-delete orphaned media_assets rows
- Add Sentry Cron Monitor

### Acceptance Criteria
- Upload works for images, documents, audio, video
- Image variants generated for all configured sizes
- Files deliverable via CDN
- File type validation rejects invalid formats
- Media library renders with grid view and folder navigation
- Multi-select and batch delete work

### Exit Criteria
Complete media system with CDN delivery.

---

## Phase 08 — CRM System

| Property | Value |
|----------|-------|
| Complexity | High |
| Risk Level | Medium |
| Estimated Agent Sessions | 8-12 |
| Dependencies | Phase 02, Phase 03, Phase 05 |

### Objectives
Build the lead management infrastructure with pipeline tracking, activity logging, SLA monitoring, UTM capture, and dashboard metrics.

### Deliverables
- Lead CRUD with full field set
- Lead pipeline (New → Contacted → Qualified → Proposal Sent → Negotiation → Won → Lost → Archived)
- Lead activities timeline
- Lead notes (internal)
- Lead assignment to users
- UTM tracking on all lead sources
- SLA tracking (15-min default)
- Follow-up queue
- Dashboard metrics

### Tasks & Subtasks

**T8.1 — Build Lead CRUD**
- Create lead routes, components, hooks, schemas
- Implement all lead fields (name, email, phone, company, country, budget, timeline, etc.)
- Implement lead source tracking
- Implement UTM parameter capture

**T8.2 — Implement Lead Pipeline**
- Create pipeline stage state machine
- Implement status transitions with validation
- Create kanban view for pipeline
- Create DataTable view as default

**T8.3 — Implement Lead Activities**
- Auto-log every status change
- Auto-log lead creation
- Display lead timeline in detail view

**T8.4 — Implement Lead Notes**
- Create internal notes CRUD
- Notes never visible to public
- Display notes in lead detail

**T8.5 — Implement Lead Assignment**
- Assign leads to users
- Filter by assigned user
- Unassigned leads view

**T8.6 — Implement SLA Tracking**
- 15-minute default SLA
- SLA status: Within SLA, Warning, Breached
- Display SLA status in lead list

**T8.7 — Implement Follow-Up Queue**
- Query leads where follow_up_date <= TODAY and status not Won/Lost
- Sort by follow_up_date ascending
- Display as actionable list

**T8.8 — Build CRM Dashboard Metrics**
- Total Leads, Qualified, Won, Lost, Conversion Rate
- Lead source breakdown chart
- Monthly growth chart

### Acceptance Criteria
- Lead creation works from all form sources
- Status changes log activities correctly
- Pipeline stages enforce correct ordering
- UTM parameters captured and stored
- SLA breaches trigger correct status
- Follow-up queue shows correct leads
- Dashboard metrics match database state

### Exit Criteria
CRM operational with pipeline, tracking, and metrics.

---

## Phase 09 — Forms System

| Property | Value |
|----------|-------|
| Complexity | Medium |
| Risk Level | Low |
| Estimated Agent Sessions | 6-8 |
| Dependencies | Phase 02, Phase 03, Phase 05, Phase 08 |

### Objectives
Build the dynamic forms platform allowing administrators to create and manage forms without developer involvement.

### Deliverables
- Dynamic form builder (add, edit, reorder fields)
- Field types: text, email, phone, textarea, select, radio, checkbox, date, file, URL, number
- Form preview modal
- Form submission handling with validation
- Auto-creation of lead from form submission
- Form analytics (views, starts, submissions, abandonments)
- Spam protection (honeypot, rate limiting, time check)
- Public form rendering

### Tasks & Subtasks

**T9.1 — Build Form Builder UI**
- Create form builder with drag-and-drop field ordering
- Implement field type selector
- Implement field configuration panel (label, required, placeholder, validation)
- Implement form preview

**T9.2 — Implement Field Types**
- Text, Email, Phone, Textarea, Select, Radio, Checkbox, Date, File, URL, Number
- Each with proper validation rules
- Each with proper rendering

**T9.3 — Implement Form Submission Handling**
- Server Action receives form submission
- Zod validation on server
- Auto-create lead record
- Send notification on submission
- Handle file uploads within forms

**T9.4 — Implement Spam Protection**
- Honeypot hidden field
- Time-based check (> 3s submit time)
- Rate limiting (3 per IP per 60s)
- Form-specific token

**T9.5 — Implement Form Analytics**
- Track views, starts, submissions, abandonments
- Calculate conversion rate
- Display charts in form detail

### Acceptance Criteria
- Forms render correctly with all defined field types
- Validation rules work for each field type
- File uploads within forms process correctly
- Submissions create lead records automatically
- Spam protection blocks rapid submissions
- Form analytics reflect actual visitor behavior

### Exit Criteria
Dynamic forms system fully operational.

---

## Phase 10 — Entrepreneur System

| Property | Value |
|----------|-------|
| Complexity | Medium |
| Risk Level | Low |
| Estimated Agent Sessions | 4-6 |
| Dependencies | Phase 02, Phase 03, Phase 05, Phase 06 |

### Objectives
Build the entrepreneur management system for ventures, products, and milestones.

### Deliverables
- Ventures CRUD (with logo, website, funding, status)
- Products CRUD (with venture linking)
- Entrepreneur profile management
- Dashboard views and listing

### Tasks & Subtasks

**T10.1 — Build Ventures Manager**
- Create ventures CRUD in dashboard
- Add fields: name, description, logo, website, founded_date, status
- Add SEO fields
- Implement DataTable view

**T10.2 — Build Products Manager**
- Create products CRUD
- Link products to ventures
- Add fields: name, description, launch_date, URL, status
- Add featured toggle

**T10.3 — Build Entrepreneur Profile Manager**
- Edit entrepreneur_profiles fields
- Manage founder story, philosophy, mission, vision
- Manage media mentions

### Acceptance Criteria
- Venture CRUD works with all fields
- Products link correctly to ventures
- SEO fields save and render
- Dashboard views are responsive

### Exit Criteria
Entrepreneur management fully operational.

---

## Phase 11 — Artist System

| Property | Value |
|----------|-------|
| Complexity | Medium |
| Risk Level | Low |
| Estimated Agent Sessions | 6-8 |
| Dependencies | Phase 02, Phase 03, Phase 05, Phase 06 |

### Objectives
Build the artist management system for releases, streaming platforms, lyrics, and event management.

### Deliverables
- Releases CRUD (with type, cover, credits)
- Streaming platform links management
- Lyrics management
- Artist events CRUD
- Event logistics management
- Availability calendar
- Event categories CRUD
- Event activity logging

### Tasks & Subtasks

**T11.1 — Build Releases Manager**
- Create releases CRUD in dashboard
- Add fields: title, type (nasheed, tilawat, acting, podcast, interview, documentary), cover_image, description, release_date
- Add streaming platform links per release
- Add credits JSONB editor
- Add lyrics editor with language support
- Add SEO fields

**T11.2 — Build Artist Events Manager**
- Create event categories CRUD from settings
- Create artist_events CRUD with status lifecycle
- Implement status transitions (Inquiry → Negotiating → Confirmed → Logistics Finalized → Completed → Declined → Cancelled → Archived)
- Create event logistics form
- Implement event activity log (auto-log on status change)
- Create availability calendar management

**T11.3 — Build Artist Profile Manager**
- Edit artist_profiles fields
- Manage biography, genre, booking info
- Manage streaming platform links

### Acceptance Criteria
- Release CRUD works with all fields
- Streaming platform links save correctly
- Lyrics editor works
- Event lifecycle transitions work with activity logging
- Availability calendar blocks dates correctly
- Dashboard views are responsive

### Exit Criteria
Artist management fully operational.

---

## Phase 12 — Client Portal

| Property | Value |
|----------|-------|
| Complexity | High |
| Risk Level | Medium |
| Estimated Agent Sessions | 10-14 |
| Dependencies | Phase 02, Phase 03, Phase 04, Phase 05, Phase 07, Phase 08 |

### Objectives
Build the client portal application, finance system, proposal system, and notifications infrastructure.

### Deliverables
- apps/portal (separate Next.js app, token auth, light mode)
- Portal tabs: Overview, Milestones, Deliverables, Messages, Payments
- Deliverable approval/revision workflow
- Portal message threading
- Finance system (payments, expenses, invoices, PDF generation)
- Proposal templates CRUD with variable substitution
- Proposal PDF generation
- Notification system with all 12 triggers
- Notification preference settings

### Tasks & Subtasks

**T12.1 — Build Client Portal App**
- Scaffold apps/portal as separate Next.js app
- Implement token-based authentication
- Create portal login page (token from URL or password)
- Create tab-based layout (Overview, Milestones, Deliverables, Messages, Payments)
- Implement light-mode-only theme

**T12.2 — Build Portal Tabs**
- Overview: project summary + activity feed
- Milestones: vertical timeline with status indicators
- Deliverables: file review, approve button, revision request with feedback
- Messages: chat-style thread (admin/client bubbles)
- Payments: summary + invoice download

**T12.3 — Build Finance System**
- Create payment methods CRUD (from Settings)
- Create finance_payments CRUD with source linking
- Create finance_expenses CRUD with category
- Create finance_invoices CRUD with auto-numbering (INV-YYYY-NNN)
- Implement PDF invoice generation with html-pdf or equivalent
- Store PDFs in R2
- Create per-project finance summary
- Create global finance dashboard

**T12.4 — Build Proposal System**
- Create proposal_templates CRUD with rich text editor
- Implement variable placeholder system ({{client_name}}, etc.)
- Create proposal_documents generation
- Implement PDF generation with variable substitution
- Create status workflow (draft → sent → accepted → rejected)
- Implement auto-create project from accepted proposal

**T12.5 — Build Notification System**
- Implement all 12 notification triggers:
  1. New lead submitted
  2. Lead status changed to Won
  3. New freelance project created
  4. Milestone marked completed
  5. Payment received
  6. Deliverable approved by client
  7. Revision requested by client
  8. New artist event inquiry
  9. Event confirmed
  10. Event upcoming reminder (3 days before)
  11. Invoice generated
  12. Overdue payment (7 days past completion)
- Implement Telegram dispatch
- Implement WhatsApp dispatch webhook
- Implement notification preference settings (Settings → Notifications)
- Create notification retry cron job

**T12.6 — Create Notification Retry Cron Job**
- Create cron endpoint POST /api/cron/retry-notifications
- Query failed notifications, retry up to 3 times
- Add Sentry Cron Monitor

### Acceptance Criteria
- Portal login works with token
- All portal tabs render correct project data
- Client can approve and request revision on deliverables
- Portal messages send and receive correctly
- Payment method CRUD works
- Invoice generates correct PDF with line items
- Per-project finance summary calculates correctly
- Proposal template variables substitute correctly
- Generated PDF stores to R2 and downloads
- Accepted proposal creates project record
- All 12 notification triggers fire to configured channels

### Exit Criteria
Client portal, finance, proposals, and notifications fully operational.

---

## Phase 13 — Search System

| Property | Value |
|----------|-------|
| Complexity | Medium |
| Risk Level | Low |
| Estimated Agent Sessions | 4-6 |
| Dependencies | Phase 02, Phase 06, Phase 16 |

### Objectives
Build the search infrastructure with PostgreSQL Full Text Search, search index, and search UI.

### Deliverables
- search_index table with tsvector support
- PostgreSQL Full Text Search implementation
- Search API endpoint with filtering
- Search UI page with instant results
- Search synonyms management
- Search reindex cron job
- Content-update-to-search-index sync

### Tasks & Subtasks

**T13.1 — Implement Search Index**
- Create search_index table with tsvector column
- Create database triggers for content → index sync
- Implement upsert pattern for index updates

**T13.2 — Implement Search API**
- Create GET /api/search with FTS query
- Implement content type, category, tag, date filters
- Implement result highlighting
- Implement pagination

**T13.3 — Build Search UI**
- Create /search page with search input and results
- Implement instant results (debounced input)
- Implement filter sidebar (content type, category, date)
- Implement result highlighting
- Implement empty state and loading state

**T13.4 — Implement Search Synonyms**
- Create search_synonyms CRUD in dashboard
- Seed initial synonym groups (AI↔Artificial Intelligence, etc.)

**T13.5 — Create Search Indexer Cron Job**
- Create cron endpoint POST /api/cron/reindex
- Diff-based sync from content tables to search_index
- Add Sentry Cron Monitor

### Acceptance Criteria
- Search returns relevant results across all content types
- Filters narrow results correctly
- Search highlights match terms in results
- Synonyms expand search correctly
- Index stays synchronized with content changes
- Search response < 500ms

### Exit Criteria
Search system complete with index and UI.

---

## Phase 14 — SEO System

| Property | Value |
|----------|-------|
| Complexity | Medium |
| Risk Level | Low |
| Estimated Agent Sessions | 4-6 |
| Dependencies | Phase 02, Phase 06, Phase 16 |

### Objectives
Implement the SEO platform with automatic metadata generation, structured data, sitemaps, redirect management, and broken link monitoring.

### Deliverables
- Metadata engine (auto-generated meta/OG tags)
- Schema.org structured data for all entity types
- Automatic sitemap generation
- Robots.txt management (dashboard-controlled)
- Redirect manager (301/302, slug history, bulk import)
- Broken link monitoring
- SEO dashboard with audit scores

### Tasks & Subtasks

**T14.1 — Implement Metadata Engine**
- Create generateMetadata() function per entity type
- Auto-generate meta title, description, OG image
- Handle missing fields with sensible defaults
- Implement per-entity override

**T14.2 — Implement Structured Data**
- Generate JSON-LD for: Person, Organization, ProfessionalService, Article, MusicRecording, BreadcrumbList, FAQPage, WebSite, SearchAction
- Inject via Next.js Metadata API

**T14.3 — Implement Sitemap Engine**
- Create dynamic sitemap.xml route
- Include all entity types with proper priorities
- Include lastmod dates
- Implement pagination for large sitemaps

**T14.4 — Implement Redirect Manager**
- Create slug_redirects CRUD in dashboard
- Support 301 and 302 redirects
- Support bulk CSV import
- Auto-create redirect when slug changes (optional)

**T14.5 — Implement Robots.txt Manager**
- Create dashboard interface for robots.txt rules
- Support allow/disallow rules
- Support environment-specific rules

**T14.6 — Build SEO Dashboard**
- Display audit scores (meta tag coverage, schema validity)
- Display broken link report
- Display sitemap status

### Acceptance Criteria
- All pages have correct meta title and description
- JSON-LD schema validates on Google Rich Results Test
- Sitemap includes all content types and is valid XML
- Redirects function correctly (301/302)
- Robots.txt reflects dashboard settings

### Exit Criteria
SEO engine producing valid markup and files.

---

## Phase 15 — Analytics & Monitoring

| Property | Value |
|----------|-------|
| Complexity | Low |
| Risk Level | Low |
| Estimated Agent Sessions | 3-4 |
| Dependencies | Phase 05, Phase 08, Phase 16 |

### Objectives
Implement analytics integrations and monitoring infrastructure.

### Deliverables
- Cloudflare Analytics edge integration
- Microsoft Clarity integration
- Umami analytics integration
- Dashboard reporting with key metrics
- Custom event tracking
- Sentry performance monitoring

### Tasks & Subtasks

**T15.1 — Integrate Cloudflare Analytics**
- Configure analytics beacon on web app
- Verify traffic data visible in Cloudflare dashboard

**T15.2 — Integrate Microsoft Clarity**
- Add Clarity script tag (deferred, non-blocking)
- Configure in service-management dashboard
- Verify session recordings

**T15.3 — Integrate Umami**
- Add Umami script with site ID
- Configure custom events
- Verify page view tracking

**T15.4 — Implement Dashboard Reporting**
- Create analytics widgets for dashboard home
- Display: visitor count, lead source breakdown, content performance

**T15.5 — Configure Sentry Performance**
- Enable performance tracing on critical routes
- Set sample rates (0.1 prod, 1.0 staging)
- Verify traces visible in Sentry

### Acceptance Criteria
- Analytics scripts load correctly (deferred, non-blocking)
- Clarity recordings capture sessions correctly
- Umami tracks page views correctly
- Dashboard reports show accurate metric data
- Sentry traces capture API route performance

### Exit Criteria
Monitoring and analytics operational.

---

## Phase 16 — Public Website

| Property | Value |
|----------|-------|
| Complexity | High |
| Risk Level | High |
| Estimated Agent Sessions | 14-20 |
| Dependencies | Phase 04, Phase 06, Phase 10, Phase 11, Phase 12 |

### Objectives
Build the complete public-facing website with all 30+ page types, responsive design, SEO metadata, and performance optimization.

### Deliverables
- Homepage with all 11 sections (Hero through Final CTA)
- Developer Profile page (10 sections)
- Entrepreneur Profile page (8 sections)
- Artist Profile page (9 sections)
- About page
- Services listing and detail pages
- Projects listing and detail pages
- Blog listing, category/tag archives, detail pages
- Case studies listing and detail pages
- Releases listing and detail pages
- Ventures listing and detail pages
- Resources listing and detail pages
- Media mentions listing and detail pages
- Timeline page
- Press kit page
- Contact page with form
- Newsletter signup page
- Global navigation (desktop + mobile)
- Footer with all sections
- Announcement bar
- Identity switcher (Developer, Entrepreneur, Artist)

### Tasks & Subtasks

**T16.1 — Build Homepage**
- Create 11 homepage sections as server components
- Implement hero with profile image, name, title, CTAs, identity links
- Implement trust indicators section (dynamic stats)
- Implement featured services grid
- Implement featured projects grid
- Implement case studies alternating rows
- Implement developer expertise grid
- Implement entrepreneur snapshot
- Implement artist snapshot
- Implement latest content feed
- Implement testimonials carousel
- Implement final CTA section
- Implement announcement bar
- Implement SEO metadata generation

**T16.2 — Build Developer Profile**
- Create /developer page with all 10 sections
- Implement developer hero, biography, experience timeline, skills, technology stack, projects, case studies, certifications, resume, CTA

**T16.3 — Build Entrepreneur Profile**
- Create /entrepreneur page with all 8 sections
- Implement founder hero, story, ventures grid, products, milestones, philosophy, media mentions, CTA

**T16.4 — Build Artist Profile**
- Create /artist page with all 9 sections
- Implement artist hero, biography, featured release, releases library, streaming platforms, lyrics, videos, press kit, booking CTA

**T16.5 — Build Content Listing Pages**
- Create /services (listing + [slug] detail)
- Create /projects (listing + [slug] detail)
- Create /blog (listing + category/[slug] + tag/[slug] + [slug] detail)
- Create /case-studies (listing + [slug] detail)
- Create /releases (listing + [slug] detail)
- Create /ventures (listing + [slug] detail)
- Create /resources (listing + [slug] detail)
- Create /media (listing + [slug] detail)

**T16.6 — Build Utility Pages**
- Create /about page
- Create /timeline page
- Create /press-kit page
- Create /book page (booking hub)
- Create /contact page with form submission
- Create /newsletter signup page
- Create /search page

**T16.7 — Build Navigation & Footer**
- Implement desktop navigation (horizontal bar, fixed top, 64px)
- Implement mobile navigation (Sheet slide from right)
- Implement identity switcher (Developer, Entrepreneur, Artist)
- Implement footer with all sections (Company, Content, Professional, Artist, Legal)

**T16.8 — Implement Performance Optimization**
- Add priority loading to hero images
- Add lazy loading to below-fold images
- Implement proper sizes attributes
- Add blur placeholders
- Verify LCP < 2s, CLS < 0.05

### Acceptance Criteria
- All pages render at all breakpoints (mobile, tablet, desktop)
- Homepage sections match PRD specification
- Navigation works correctly on mobile and desktop
- All SEO metadata renders correctly in <head>
- Identity switcher navigates correctly between profiles
- Contact form submits and creates lead
- Newsletter signup works
- Performance: LCP < 2s, CLS < 0.05

### Exit Criteria
Complete public website with all pages.

---

## Phase 17 — Testing & QA

| Property | Value |
|----------|-------|
| Complexity | Medium |
| Risk Level | Medium |
| Estimated Agent Sessions | 8-12 |
| Dependencies | Phases 01-16 |

### Objectives
Comprehensive testing across all layers covering unit, integration, E2E, accessibility, and performance.

### Deliverables
- Unit tests for all business logic, repositories, validators
- Integration tests for all API endpoints
- E2E tests for critical flows (Playwright)
- Accessibility tests (aXe)
- Performance regression tests

### Tasks & Subtasks

**T17.1 — Write Unit Tests**
- Test all repository CRUD operations
- Test all Zod validation schemas
- Test all business logic (status transitions, finance calculations, etc.)
- Test utility functions
- Target > 80% coverage

**T17.2 — Write Integration Tests**
- Test all API endpoint groups
- Test form submission → lead creation flow
- Test auth and permission checks
- Test file upload flow

**T17.3 — Write E2E Tests (Playwright)**
- Homepage renders correctly
- Contact form submits → lead created
- Newsletter subscribe flow
- Artist booking form
- Dashboard login
- Content publishing workflow (create → schedule → publish)
- Lead management (create → status change → won)
- Client portal access

**T17.4 — Write Accessibility Tests**
- All public pages with aXe
- Key dashboard pages
- Fix all critical violations
- Target WCAG AA compliance

**T17.5 — Performance Regression Tests**
- Run Lighthouse CI on all public pages
- Verify LCP, CLS, INP targets
- Verify bundle size budgets

### Acceptance Criteria
- All unit tests pass (> 80% coverage)
- Integration tests pass for all critical API endpoints
- E2E tests pass for all critical user flows
- No critical accessibility violations
- Lighthouse scores: Performance 95+, Accessibility 95+, SEO 100

### Exit Criteria
Quality verified through automated testing.

---

## Phase 18 — Production Hardening

| Property | Value |
|----------|-------|
| Complexity | Medium |
| Risk Level | Low |
| Estimated Agent Sessions | 6-8 |
| Dependencies | Phase 17 |

### Objectives
Optimize performance, harden security, and ensure production readiness.

### Deliverables
- Core Web Vitals optimization
- Bundle size optimization
- Caching strategy implementation
- Security hardening (CSP headers, rate limiting)
- Accessibility improvements
- Performance budget in CI

### Tasks & Subtasks

**T18.1 — Optimize Core Web Vitals**
- Audit and fix LCP issues (server response time, render-blocking resources)
- Audit and fix CLS issues (image dimensions, font loading, dynamic content)
- Audit and fix INP issues (long tasks, event handlers)

**T18.2 — Optimize Bundle Size**
- Audit bundle with @next/bundle-analyzer
- Implement code splitting for heavy components
- Implement dynamic imports for RichTextEditor, Kanban, Charts
- Reduce homepage critical JS < 150KB

**T18.3 — Implement Caching Strategy**
- Configure Cloudflare CDN cache rules
- Implement Next.js Data Cache with tag-based invalidation
- Configure TanStack Query stale times
- Verify cache invalidation works on content publish

**T18.4 — Security Hardening**
- Implement CSP headers
- Implement rate limiting on all public endpoints
- Review input sanitization on rich text
- Verify security headers (X-Frame-Options, HSTS, etc.)

**T18.5 — Accessibility Pass**
- Run full aXe scan on all pages
- Fix remaining violations
- Verify keyboard navigation flows
- Verify screen reader flows

### Acceptance Criteria
- LCP < 2 seconds on production
- CLS < 0.05
- INP < 150ms
- Homepage critical JS bundle < 150KB
- Lighthouse Performance 95+, Accessibility 95+, Best Practices 95+
- No critical security vulnerabilities
- CSP headers present and valid

### Exit Criteria
Platform optimized for production release.

---

## Phase 19 — Launch Preparation

| Property | Value |
|----------|-------|
| Complexity | Low |
| Risk Level | Medium |
| Estimated Agent Sessions | 4-6 |
| Dependencies | Phase 18 |

### Objectives
Prepare all infrastructure, monitoring, and procedures for production launch.

### Deliverables
- Production Supabase project configured
- Production R2 bucket configured
- Cloudflare DNS configured (domain → Vercel + CDN)
- Cloudflare Cron Triggers registered
- Sentry release tracking configured
- Deployment runbook finalized
- Rollback procedure verified
- Smoke test suite ready

### Tasks & Subtasks

**T19.1 — Configure Production Infrastructure**
- Create production Supabase project
- Apply migrations to production database
- Create production R2 bucket
- Configure Cloudflare DNS (A/CNAME records to Vercel)
- Configure Cloudflare CDN cache rules

**T19.2 — Register Cron Triggers**
- Register all 7 cron triggers in Cloudflare Dashboard
- Verify each endpoint responds with CRON_SECRET auth
- Verify Sentry Cron Monitors show green

**T19.3 — Configure Production Monitoring**
- Set up Sentry release tracking via CI
- Configure Sentry alert rules (errors > 10/min)
- Configure uptime monitoring (Better Stack or equivalent)
- Configure Slack notification channel

**T19.4 — Verify Rollback Procedure**
- Test Vercel instant rollback
- Test database migration rollback
- Document rollback steps

**T19.5 — Prepare Smoke Test Suite**
- Create manual smoke test checklist
- Create automated smoke test script
- Verify all critical routes return 200

### Acceptance Criteria
- Production infrastructure configured and verified
- All cron triggers registered and responding
- Sentry tracking configured with release tags
- Rollback procedure tested and confirmed working
- Smoke test suite ready

### Exit Criteria
Launch preparation complete.

---

## Phase 20 — Production Release

| Property | Value |
|----------|-------|
| Complexity | Low |
| Risk Level | High |
| Estimated Agent Sessions | 3-4 |
| Dependencies | Phase 19 |

### Objectives
Execute production deployment, verify all systems, and confirm platform is live and monitored.

### Deliverables
- Production deployment to Vercel
- Production database migration
- CDN verification
- DNS verification
- Smoke test execution
- Monitoring dashboard verification
- Go/No-Go signoff

### Tasks & Subtasks

**T20.1 — Deploy to Production**
- Trigger production deploy via CI (push to main)
- Monitor build output for errors
- Verify deployment status on Vercel dashboard

**T20.2 — Apply Production Database Migration**
- Run migrations against production database
- Verify all tables created correctly
- Verify indexes created correctly

**T20.3 — Execute Smoke Tests**
- Run automated smoke tests
- Verify: homepage, contact form, newsletter, login, content publish
- Verify: CDN caching, SSL certificate, domain redirect
- Verify: cron jobs execute without errors

**T20.4 — Verify Monitoring**
- Confirm Sentry receiving events
- Confirm uptime monitor shows green
- Confirm analytics receiving data

**T20.5 — Go/No-Go Signoff**
- Review all acceptance criteria
- Review remaining risk register
- Obtain signoff
- Announce launch

### Acceptance Criteria
- Production deployment successful
- All critical routes return HTTP 200
- Contact form submits and creates lead
- Newsletter subscribe flow works end-to-end
- Dashboard login works
- Content publishing works
- CDN serving cached assets
- Sentry capturing errors
- Rollback tested and confirmed working

### Exit Criteria
Platform live and monitored on production.

---

## 3. Phase Summary

| Phase | Sessions | Complexity | Risk | Dependencies |
|-------|----------|-----------|------|--------------|
| 01 — Repository & Foundation | 6-8 | Medium | Low | None |
| 02 — Database & Drizzle | 10-14 | High | Medium | 01 |
| 03 — Authentication & RBAC | 6-8 | Medium | Medium | 02 |
| 04 — Shared Packages | 8-10 | Medium | Low | 01, 03 |
| 05 — Dashboard Foundation | 6-8 | Medium | Low | 03, 04 |
| 06 — CMS Core | 12-16 | High | Medium | 02, 03, 05 |
| 07 — Media System | 6-8 | Medium | Medium | 02, 03, 05 |
| 08 — CRM System | 8-12 | High | Medium | 02, 03, 05 |
| 09 — Forms System | 6-8 | Medium | Low | 02, 03, 05, 08 |
| 10 — Entrepreneur System | 4-6 | Medium | Low | 02, 03, 05, 06 |
| 11 — Artist System | 6-8 | Medium | Low | 02, 03, 05, 06 |
| 12 — Client Portal | 10-14 | High | Medium | 02, 03, 04, 05, 07, 08 |
| 13 — Search System | 4-6 | Medium | Low | 02, 06, 16 |
| 14 — SEO System | 4-6 | Medium | Low | 02, 06, 16 |
| 15 — Analytics & Monitoring | 3-4 | Low | Low | 05, 08, 16 |
| 16 — Public Website | 14-20 | High | High | 04, 06, 10, 11, 12 |
| 17 — Testing & QA | 8-12 | Medium | Medium | 01-16 |
| 18 — Production Hardening | 6-8 | Medium | Low | 17 |
| 19 — Launch Preparation | 4-6 | Low | Medium | 18 |
| 20 — Production Release | 3-4 | Low | High | 19 |
| **Total** | **185-220** | | | |
