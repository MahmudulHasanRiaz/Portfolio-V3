# Multi-Agent Execution Plan

> **Architecture Reference:** [Architecture Package](../architecture/)  
> **Masterplan Reference:** [MASTERPLAN.md](./MASTERPLAN.md)  
> **Strategy Reference:** [IMPLEMENTATION_STRATEGY.md](./IMPLEMENTATION_STRATEGY.md)  
> **Status:** Approved for Execution  
> **Version:** 1.0

---

## 1. Agent Roles & Responsibilities

### Role Definitions

| Role | Code | Phases | Primary Responsibility |
|------|------|--------|----------------------|
| Foundation Engineer | `AGENT-FE` | 01-05 | Monorepo, DB, Auth, Shared Packages, Dashboard Shell |
| CMS Engineer | `AGENT-CMS` | 06 | Content management, rich text, scheduling engine |
| Media Engineer | `AGENT-MEDIA` | 07 | R2 storage, image optimization, media library |
| CRM Engineer | `AGENT-CRM` | 08-09 | Lead pipeline, forms builder, spam protection |
| Operations Engineer | `AGENT-OPS` | 10-12 | Entrepreneur, Artist, Portal, Finance, Proposals, Notifications |
| Website Engineer | `AGENT-WEB` | 16 | Public website, all 30+ page types, navigation, identity switcher |
| Search/SEO Engineer | `AGENT-SEO` | 13-15 | Search FTS, metadata engine, structured data, analytics |
| QA Engineer | `AGENT-QA` | 17 | Unit, integration, E2E, accessibility, performance tests |
| Hardening Engineer | `AGENT-HARD` | 18 | CWV optimization, bundle size, security headers, caching |
| Launch Engineer | `AGENT-LAUNCH` | 19-20 | Infrastructure config, deployment, smoke tests, monitoring |

### Role Boundaries

| Role | Owns | Does Not Own |
|------|------|-------------|
| AGENT-FE | Root config, all packages/* initial setup, database, auth, dashboard shell | Feature-specific business logic (CMS, CRM, Portal) |
| AGENT-CMS | packages/cms, dashboard CMS pages | Media picker (stubs it), search index (syncs later) |
| AGENT-MEDIA | packages/cms media module, R2 integration, media library UI | Content management, file validation schema (uses shared) |
| AGENT-CRM | packages/crm, dashboard CRM pages, packages/crm forms | Notification dispatch (calls notifications package) |
| AGENT-OPS | packages/{freelance,events,finance,portal,proposals,notifications}, apps/portal | Public website pages, auth infrastructure |
| AGENT-WEB | apps/web all pages, public navigation, identity switcher | Dashboard, portal, search UI (stubs it) |
| AGENT-SEO | packages/{search,seo,analytics}, search UI, SEO dashboard | Website layout, content creation |
| AGENT-QA | Test files across all packages, Playwright config, CI test workflow | Implementation code |
| AGENT-HARD | Config files for perf, security headers, cache rules | Feature functionality |
| AGENT-LAUNCH | Infra config files, deployment workflows, runbook | Product code |

---

## 2. Agent Handoff Protocol

### 2.1 Handoff Flow

```
AGENT-FE ──┬── AGENT-CMS ──┬── AGENT-WEB ──┬── AGENT-SEO
           │               │                │
           ├── AGENT-MEDIA ┘                │
           │                                │
           ├── AGENT-CRM ─── AGENT-OPS ─────┘
           │                                │
           └────────────────────────────────┴── AGENT-QA → AGENT-HARD → AGENT-LAUNCH
```

### 2.2 Handoff Document Template

Each handoff between agents must produce a handoff document stored at `docs/execution/handoffs/HANDOFF-{From}-{To}.md`:

```markdown
# Handoff: AGENT-FE → AGENT-CMS

## Completed
- Phase 01: Repository scaffolded, CI passing
- Phase 02: All 72 schemas created, migrations applied, seed data loaded
- Phase 03: Auth configured, RBAC seeded with roles/permissions
- Phase 04: Shared packages built (ui, validation, shared)
- Phase 05: Dashboard shell renders with auth guard

## Known Issues
- Sentry test event not yet captured (requires DSN in production)
- Media picker not available — use stub from packages/cms/stubs/MediaPicker.tsx

## Architecture Decisions
- packages/database exports all repositories from index.ts
- packages/auth exports session helpers — import from @repo/auth
- Dashboard routes defined in apps/dashboard/src/routes.ts

## Files to Review
- packages/database/src/schema/ (all 18 domain directories)
- packages/auth/src/index.ts
- packages/ui/src/components/ (Button, Input, Card, etc.)
```

### 2.3 Handoff Checklist

```
□ All phase acceptance criteria met (list from MASTERPLAN.md)
□ All exit criteria met
□ Build passes (pnpm build)
□ Tests pass (pnpm test)
□ Lint passes (pnpm lint)
□ Typecheck passes (pnpm typecheck)
□ All environment variables documented
□ Stubs in place for unbuilt dependencies
□ Migration files committed
□ No architecture freeze violations
□ Cross-document references valid
```

---

## 3. Agent Execution Rules

### 3.1 Universal Rules

| Rule | Description | Violation Consequence |
|------|-------------|---------------------|
| **R1: Architecture Freeze** | No technology changes, no schema redesign, no new product modules | Remediation required before merge |
| **R2: Frozen Interfaces** | Repository signatures, API response shapes, package exports are immutable after definition | Must use adapter pattern |
| **R3: Append-Only Migrations** | Never modify a committed migration — create new migration files only | Rollback + recreate |
| **R4: Additive Exports** | Never remove or rename a public export from a packages | Deprecation warning + migration period |
| **R5: No Cross-App Imports** | Apps import from packages only — never import directly from another app | Refactor to shared package |
| **R6: No Circular Packages** | Package dependency graph must remain acyclic | Break cycle via interface extraction |
| **R7: Single File Ownership** | No two agents edit the same file in parallel | Serialize access via handoff |
| **R8: PRD Compliance** | Every feature must trace to a PRD requirement | Document the trace or stub |
| **R9: Complete Before Handoff** | Phase exit criteria must be 100% met before handoff to next agent | Hold at quality gate |
| **R10: Validation Before Claim** | Run all verification commands before declaring success | Evidence required |

### 3.2 Phase-Specific Rules

| Phase | Agent | Specific Rules |
|-------|-------|----------------|
| 01 | AGENT-FE | All directory names must match SYSTEM_ARCHITECTURE §3.1 exactly. `pnpm-workspace.yaml` must include all packages. |
| 02 | AGENT-FE | Table names use plural convention. All 72 tables must match DATA_MODEL.md 1:1. Each schema file exports relations and indexes. |
| 03 | AGENT-FE | Roles and permissions seeded exactly as listed in RBAC.md. Session cookie must use httpOnly, secure, sameSite=lax. |
| 04 | AGENT-FE | shadcn/ui components use CSS variables from design tokens. All components must support dark/light mode. |
| 05 | AGENT-FE | Sidebar navigation must match ROUTES.md §2. TanStack Router routes must match ROUTES.md §2 exactly. |
| 06 | AGENT-CMS | Rich text editor must save HTML. Content scheduling uses `publish_at`/`expires_at` columns. Status workflow: Draft→Published→Archived. |
| 07 | AGENT-MEDIA | Image variants: thumbnail(150), small(480), medium(1024), large(2048), original. Formats: AVIF, WebP, JPEG. |
| 08 | AGENT-CRM | Pipeline stages enforced: New→Contacted→Qualified→Proposal Sent→Negotiation→Won→Lost→Archived. SLA default: 15 minutes. |
| 09 | AGENT-CRM | Field types must match PRD exactly. Auto-create lead on form submission. Spam protection: honeypot + rate limit + time check. |
| 10 | AGENT-OPS | Venture statuses, product statuses, and profile sections must match FRONTEND_ARCHITECTURE §3. |
| 11 | AGENT-OPS | Release types: nasheed, tilawat, acting, podcast, interview, documentary. Event statuses exactly as defined in DATA_MODEL. |
| 12 | AGENT-OPS | Portal tabs: Overview, Milestones, Deliverables, Messages, Payments. Invoice numbering: INV-YYYY-NNN. 12 notification triggers. |
| 13 | AGENT-SEO | FTS implementation must use tsvector. Search response < 500ms. Synonyms must expand query terms. |
| 14 | AGENT-SEO | JSON-LD schema types: Person, Organization, ProfessionalService, Article, MusicRecording, BreadcrumbList, FAQPage, WebSite, SearchAction. |
| 15 | AGENT-SEO | Scripts must be deferred/non-blocking. Sentry sample rate: 0.1 prod, 1.0 staging. |
| 16 | AGENT-WEB | 11 homepage sections in order. Server Components by default. ISR for content pages. LCP < 2s, CLS < 0.05. |
| 17 | AGENT-QA | Coverage > 80%. Lighthouse: Performance 95+, Accessibility 95+, SEO 100. WCAG AA. |
| 18 | AGENT-HARD | Homepage critical JS < 150KB. CSP headers. Cloudflare CDN cache rules. |
| 19 | AGENT-LAUNCH | All 7 cron triggers registered. Sentry Cron Monitors green. Smoke test passes. |
| 20 | AGENT-LAUNCH | Production deploy via CI. Rollback tested. Go/No-Go signoff obtained. |

---

## 4. Validation Framework

### 4.1 Per-Phase Validation Checklist

Each agent must run these checks before declaring a phase complete:

**Build & Type Validation:**
```
□ pnpm build passes  
□ pnpm lint passes with zero errors  
□ pnpm typecheck passes with zero errors  
```

**Architecture Compliance:**
```
□ No deviation from DATA_MODEL.md schemas  
□ No deviation from API_DESIGN.md endpoints  
□ No deviation from ROUTES.md route definitions  
□ No deviation from RBAC.md permission model  
□ No deviation from FRONTEND_ARCHITECTURE.md component hierarchy  
□ No deviation from ENVIRONMENT_VARIABLES.md variable definitions  
```

**Quality Checks:**
```
□ All acceptance criteria from MASTERPLAN.md met  
□ Tests passing (unit/integration for phase scope)  
□ Responsive at mobile/tablet/desktop (if UI phase)  
□ Dark/light mode functional (if UI phase)  
□ Keyboard navigable (if UI phase)  
```

### 4.2 Integration Validation Points

When two agents' work intersects, an integration validation is required:

| Integration Point | Agents | Validation |
|------------------|--------|------------|
| Phase 04 → Phase 05 | AGENT-FE | Dashboard imports packages/ui, packages/auth |
| Phase 06 → Phase 07 | AGENT-CMS → AGENT-MEDIA | CMS content editor opens media picker from Phase 07 |
| Phase 06 → Phase 10/11 | AGENT-CMS → AGENT-OPS | Entrepreneur/Artist managers follow CMS patterns |
| Phase 08 → Phase 09 | AGENT-CRM | Form submissions create leads |
| Phase 08 → Phase 12 | AGENT-CRM → AGENT-OPS | Lead→Project conversion at proposal acceptance |
| Phase 12 → Phase 16 | AGENT-OPS → AGENT-WEB | Public website reads freelance/event/portal data |
| Phase 16 → Phase 13/14 | AGENT-WEB → AGENT-SEO | SEO metadata renders on public pages, search indexes content |

### 4.3 Validation Tools

| Check | Command | When |
|-------|---------|------|
| Build | `pnpm build` | Every phase |
| Lint | `pnpm lint` | Every phase |
| Typecheck | `pnpm typecheck` | Every phase |
| Unit Tests | `pnpm test -- --coverage` | Phase 17, spot-check earlier |
| E2E Tests | `npx playwright test` | Phase 17 |
| Lighthouse | `npx lighthouse-ci` | Phase 16, 18 |
| aXe | `npx axe-core` | Phase 17 |
| Bundle | `npx next bundle-analyzer` | Phase 18 |
| API Tests | `pnpm test:integration` | Phase 17 |

---

## 5. Package Dependency Map

### 5.1 Build Dependency Graph

```
packages/shared        ─── no internal deps
packages/validation    ─── packages/shared
packages/database      ─── packages/shared
packages/auth          ─── packages/database, packages/shared
packages/ui            ─── packages/shared
packages/seo           ─── packages/database, packages/shared
packages/email         ─── packages/shared
packages/analytics     ─── packages/shared
packages/notifications ─── packages/email, packages/shared
packages/cms           ─── packages/database, packages/auth, packages/shared
packages/crm           ─── packages/database, packages/auth, packages/shared
packages/search        ─── packages/database, packages/shared
packages/freelance     ─── packages/database, packages/auth, packages/shared
packages/events        ─── packages/database, packages/auth, packages/shared
packages/finance       ─── packages/database, packages/auth, packages/shared
packages/portal        ─── packages/database, packages/auth, packages/shared
packages/proposals     ─── packages/database, packages/auth, packages/shared

apps/web               ─── packages/{database,auth,ui,seo,search,analytics,cms,events,freelance,finance,shared}
apps/dashboard         ─── packages/{database,auth,ui,cms,crm,search,seo,analytics,events,freelance,finance,portal,proposals,notifications,shared}
apps/portal            ─── packages/{database,auth,ui,freelance,finance,portal,proposals,notifications,shared}
```

### 5.2 Build Order

```
Level 1: packages/shared, packages/validation
Level 2: packages/database, packages/ui, packages/email, packages/analytics
Level 3: packages/auth, packages/seo
Level 4: packages/cms, packages/crm, packages/search, packages/freelance, packages/events, packages/finance, packages/portal, packages/proposals, packages/notifications
Level 5: apps/dashboard, apps/web, apps/portal
```

---

## 6. Communication Protocol

### 6.1 Agent-to-Agent Communication

| Channel | Purpose | Format |
|---------|---------|--------|
| Handoff Documents | Phase completion | Markdown at `docs/execution/handoffs/` |
| Integration Tests | Cross-agent validation | Playwright test at `apps/web/e2e/` or `apps/dashboard/e2e/` |
| Shared Types | Interface contracts | packages/shared/src/types/ |
| Architecture Issues | Freeze violations or gaps | Issue/CR-03 in GitHub |

### 6.2 Escalation Path

```
Implementation Agent
       │
       ▼
Phase Owner (AGENT-FE for foundation phases, etc.)
       │
       ▼
Architecture Owner (CR-03 approval)
       │
       ▼
PRD Owner (frozen — only for PRD contradictions)
```

### 6.3 Response Time SLAs

| Request Type | Max Response Time | Notes |
|-------------|------------------|-------|
| CR-03 Change Request | 4 hours | Architecture owner |
| Cross-agent dependency question | 2 hours | Between agents |
| Integration test failure | 1 hour | Both agents involved |
| Build failure (shared package) | 30 minutes | Package owner |

---

## 7. Error Recovery

### 7.1 Agent Failure Recovery

If an agent fails mid-phase:

1. **Preserve state** — agent saves all work-in-progress to branch
2. **Document position** — handoff document with incomplete items listed
3. **New agent resumes** — reads handoff document, reviews WIP branch
4. **Verification pass** — runs all verification checks before continuing
5. **Continue from failure point** — do not restart from phase beginning

### 7.2 Build Failure Recovery

If `pnpm build` breaks after a merge:

1. **Identify breaking change** — `git bisect` or diff review
2. **Revert if needed** — `git revert` the breaking commit
3. **Fix in isolation** — reproduce in a clean branch
4. **Verify** — build, lint, typecheck pass before re-merging

### 7.3 Migration Failure Recovery

If a database migration fails:

1. **Rollback** — run `drizzle-kit drop` or restore from backup
2. **Fix migration** — correct the SQL in a new migration file
3. **Re-apply** — run `drizzle-kit migrate` on clean database
4. **Verify** — all tables, indexes, relations match DATA_MODEL.md

---

## 8. Summary

| Property | Value |
|----------|-------|
| Agent Roles | 10 (FE, CMS, Media, CRM, OPS, WEB, SEO, QA, HARD, LAUNCH) |
| Handoff Points | 9 (FE→CMS, FE→CRM, FE→MEDIA, CMS→OPS, CRM→OPS, OPS→WEB, WEB→SEO, ALL→QA, QA→HARD, HARD→LAUNCH) |
| Validation Gates | 7 (Phase 01, 05, 12, 16, 17, 19, 20) |
| Integration Points | 7 (cross-agent validations) |
| Universal Rules | 10 (R1-R10) |
| Max Parallel Agents | 3 (Foundation + CMS/Media + CRM) |
| Escalation Path | 3 levels (Agent → Phase Owner → Architecture Owner) |
