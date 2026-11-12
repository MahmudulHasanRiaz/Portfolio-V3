# Implementation Strategy

> **Architecture Reference:** [Architecture Package](../architecture/)  
> **Masterplan Reference:** [MASTERPLAN.md](./MASTERPLAN.md)  
> **Status:** Approved for Execution  
> **Version:** 1.0

---

## 1. Strategy Overview

### 1.1 Core Principles

| Principle | Description |
|-----------|-------------|
| **Foundation First** | No feature work begins until repository builds, database migrates, and auth works |
| **Data Before UI** | Schemas → Repositories → API → Components — every layer proven before the next |
| **Smallest Deployable Increment** | Every phase produces a running, testable vertical slice |
| **Architecture Freeze** | No redesign — implementation follows architecture docs verbatim |
| **Parallel Where Possible** | Independent subtasks run concurrently; dependencies gate only the critical path |

### 1.2 Execution Tracks

The 20 masterplan phases are organized into 6 execution tracks. Tracks run sequentially as a whole, but within each track, independent phases can be parallelized.

```
Track 1: Foundation ──────── Phases 01-05 (sequential chain)
Track 2: Content + Media ─── Phases 06-07 (parallel after Phase 05)
Track 3: CRM + Forms ──────── Phases 08-09 (sequential chain after Phase 05)
Track 4: Operations ───────── Phases 10-12 (parallel after Phase 06)
Track 5: Website + Search ─── Phases 13-16 (gate at Phase 16 for public site)
Track 6: Finalization ─────── Phases 17-20 (strict sequential chain)
```

---

## 2. Track Details

### Track 1 — Foundation (Phases 01-05)

**Order:** Strictly sequential. Each phase produces output consumed by the next.

```
Phase 01 (Repo) → Phase 02 (DB) → Phase 03 (Auth) → Phase 04 (Packages) → Phase 05 (Dashboard)
```

**Strategy:**
- Phase 01: Scaffold entire monorepo skeleton — all `apps/` and `packages/` directories created empty
- Phase 02: All 72 schemas generated as single batch; migrations applied incrementally per domain
- Phase 03: Auth seeded with all 10 roles and 52 permissions; no runtime overhead for unused roles
- Phase 04: Shared packages built after auth so packages/auth can depend on packages/database
- Phase 05: Dashboard shell consumes packages/ui, packages/auth, packages/shared

**Parallelization within phases:**
- Phase 01 T1.1-T1.6: T1.1 (scaffold) must complete before T1.2-T1.6; T1.2-T1.6 are independent
- Phase 02 T2.2-T2.9: All schema groups independent — can be parallelized by domain
- Phase 04 T4.1-T4.7: All packages independent — can be parallelized 7-wide

**Critical path through Track 1:** 01 → 02 → 03 → 04 → 05 (5 sequential phases, ~36-48 sessions)

---

### Track 2 — Content + Media (Phases 06-07)

**Order:** Parallel. Both depend on Phase 05 but not on each other.

```
Phase 05 (Dashboard)
       ├── Phase 06 (CMS Core)
       └── Phase 07 (Media System)
```

**Strategy:**
- Phase 06: Build content management first — it has more downstream dependents
- Phase 07: Media system can run alongside CMS; media library is consumed by CMS content editors
- Integration point: CMS content editors embed media picker from Phase 07 — stub media picker in Phase 06, wire real integration in Phase 07+06 integration pass

**Parallelization within phases:**
- Phase 06 T6.1-T6.8: T6.1-T6.6 (individual managers) are independent; T6.7 (scheduling) depends on content entities existing; T6.8 (workflow) depends on T6.7
- Phase 07 T7.1-T7.5: T7.1 (R2) must precede T7.2 (optimization); T7.3 (UI) depends on T7.1; T7.4 (validation) is independent; T7.5 (cleanup) is last

**Critical path through Track 2:** 05 → Phase 06 → ... (Phase 06 is gating for Phase 10, 11, 16)

---

### Track 3 — CRM + Forms (Phases 08-09)

**Order:** Sequential. Forms depend on CRM leads.

```
Phase 05 (Dashboard) → Phase 08 (CRM) → Phase 09 (Forms)
```

**Strategy:**
- Phase 08: Leads pipeline, activities, notes, SLA, assignment — complete CRM before forms
- Phase 09: Form submissions auto-create leads — requires lead repository from Phase 08
- Integration: Form analytics stored in form_analytics table (Phase 09 schema) separate from CRM

**Parallelization within phases:**
- Phase 08 T8.1-T8.8: T8.1 (lead CRUD) first; T8.2-T8.6 depend on T8.1; T8.7 (follow-up) depends on T8.2; T8.8 (metrics) is last
- Phase 09 T9.1-T9.5: T9.1 (builder) first; T9.2 (field types) depends on T9.1; T9.3 (submissions) depends on T9.2; T9.4 (spam) runs with T9.3; T9.5 (analytics) last

**Critical path through Track 3:** 05 → 08 → 09 → gates Phase 12

---

### Track 4 — Operations (Phases 10-12)

**Order:** Parallel starts after Phase 06 gate.

```
Phase 06 (CMS Core)
       ├── Phase 10 (Entrepreneur)
       ├── Phase 11 (Artist)
       └── Phase 12 (Client Portal) ← also gated by Phase 07 + Phase 08
```

**Strategy:**
- Phase 10 (Entrepreneur): Ventures + Products — builds on CMS patterns, relatively simple
- Phase 11 (Artist): Releases + Events — builds on CMS patterns, medium complexity
- Phase 12 (Client Portal): Highest complexity phase — depends on Phase 06, 07, 08;
  includes Finance, Proposals, Notifications subsystems

**Dependency chain for Phase 12:**
```
Phase 06 ─── Phase 07 ─── Phase 12
Phase 08 ───────────────── Phase 12
Phase 04 ───────────────── Phase 12
Phase 05 ───────────────── Phase 12
```

**Parallelization within phases:**
- Phase 12 T12.1-T12.6: T12.1 (portal app) first; T12.2 (portal tabs) depends on T12.1 + Phase 10/11 data;
  T12.3 (finance) is independent; T12.4 (proposals) is independent; T12.5 (notifications) depends on T12.3;
  T12.6 (retry cron) depends on T12.5

**Critical path through Track 4:** Phase 12 gate = Phase 06 + Phase 07 + Phase 08 complete

---

### Track 5 — Website + Search + SEO (Phases 13-16)

**Order:** Phase 16 (Public Website) gates Phase 13 (Search) and Phase 14 (SEO). Phase 15 (Analytics) is independent.

```
Phase 04 ─────────────────────────────────── Phase 16 (Public Website) ───┬── Phase 13 (Search)
Phase 06 ─────────────────────────────────── Phase 16                      ├── Phase 14 (SEO)
Phase 10 + 11 + 12 ──────────────────────── Phase 16                      │
                                                                           └── Phase 15 (Analytics) ← also gated by Phase 05 + Phase 08
```

**Strategy:**
- Phase 16 (Public Website): Largest single phase (14-20 sessions). Build homepage first (T16.1),
  then profile pages (T16.2-T16.4), then listing pages (T16.5), then utility pages (T16.6),
  then navigation (T16.7). Performance optimization (T16.8) is last.
- Phase 13 (Search): Depends on Phase 16 because search UI is a public page. Search index schema and API can be built in parallel with Phase 16 web pages.
- Phase 14 (SEO): Metadata engine and structured data built after public pages exist to test against.
- Phase 15 (Analytics): Scripts loaded in web app; dashboard widgets depend on Phase 08 data.

**Parallelization within phases:**
- Phase 16 T16.1-T16.8: T16.1 (homepage) first; T16.2-T16.4 (profiles) independent of each other but depend on T16.1 patterns; T16.5 (listings) depends on T16.2-T16.4 patterns; T16.6 (utility) depends on T16.5; T16.7 (nav) runs early; T16.8 (perf) is last
- Phase 13 T13.1-T13.5: T13.1 (index) first; T13.2 (API) depends on T13.1; T13.3 (UI) depends on T13.2; T13.4 (synonyms) independent; T13.5 (cron) last

**Critical path through Track 5:** Phase 16 complete (gates Phase 13, 14)

---

### Track 6 — Finalization (Phases 17-20)

**Order:** Strictly sequential.

```
Phase 17 (Testing) → Phase 18 (Hardening) → Phase 19 (Launch Prep) → Phase 20 (Release)
```

**Strategy:**
- Phase 17: Unit tests first, then integration tests, then E2E. Fixes during testing are additive — no architecture changes permitted.
- Phase 18: Web Vitals optimization, bundle analysis, security hardening. All changes are optimization-only.
- Phase 19: Infrastructure configuration, cron registration, monitoring setup.
- Phase 20: Final deployment and smoke tests.

**Critical path through Track 6:** Phase 17 → 18 → 19 → 20 (4 phases, ~21-30 sessions)

---

## 3. Dependency Map

### 3.1 Full Dependency Graph

```
Phase 01 (no deps)
  │
  ▼
Phase 02 (01)
  │
  ▼
Phase 03 (02)
  │
  ├──────────────────────┐
  ▼                       ▼
Phase 04 (01, 03)      Phase 08 (02, 03, 05)
  │                       │
  ▼                       ▼
Phase 05 (03, 04)      Phase 09 (02, 03, 05, 08)
  │                       │
  ├────────┬──────┬──────┘
  ▼        ▼      ▼
Phase 06  Phase 07  └────── Phase 12 (02, 03, 04, 05, 07, 08)
  │        │
  ├────────┤
  ▼        ▼
Phase 10  Phase 11  ─────── Phase 16 (04, 06, 10, 11, 12)
  │        │                  │
  └────────┴──────────────────┤
                              │
             ┌────────────────┤
             ▼                ▼
         Phase 13 (02, 06, 16)
         Phase 14 (02, 06, 16)
         Phase 15 (05, 08, 16)
                              │
                              ▼
                         Phase 17 (01-16)
                              │
                              ▼
                         Phase 18 (17)
                              │
                              ▼
                         Phase 19 (18)
                              │
                              ▼
                         Phase 20 (19)
```

### 3.2 Gating Dependencies

| Gate | Prerequisites | Phases Unlocked |
|------|--------------|-----------------|
| **Gate A** | Phase 01 complete | Phase 02, 04 |
| **Gate B** | Phase 03 complete | Phase 04, 05, 08, 07 |
| **Gate C** | Phase 05 complete | Phase 06, 07, 08, 09, 15 (partial) |
| **Gate D** | Phase 06 complete | Phase 10, 11, 13, 14, 16 (partial) |
| **Gate E** | Phase 12 complete | Phase 16 (full) |
| **Gate F** | Phase 16 complete | Phase 13, 14, 15 (full) |
| **Gate G** | All phases 01-16 | Phase 17 |

### 3.3 Session Allocation per Track

| Track | Phases | Sessions | % of Total | Agent Count (if parallel) |
|-------|--------|----------|------------|--------------------------|
| Foundation | 01-05 | 36-48 | 20-22% | 1-2 |
| Content + Media | 06-07 | 18-24 | 10-11% | 2 |
| CRM + Forms | 08-09 | 14-20 | 8-9% | 2 |
| Operations | 10-12 | 20-28 | 11-13% | 3 |
| Website + Search | 13-16 | 25-36 | 14-16% | 2-3 |
| Finalization | 17-20 | 21-30 | 11-14% | 1-2 |

**Estimated total: 185-220 sessions.**

---

## 4. Merge Conflict Avoidance

### 4.1 Workspace Boundaries

Each package and app has clear ownership. No two agents should modify the same file simultaneously.

| Workspace | Owned By | Shared With |
|-----------|----------|-------------|
| `apps/web` | Public Website agent | — |
| `apps/dashboard` | Dashboard agent | — |
| `apps/portal` | Portal agent | — |
| `packages/database/src/schema/*` | Database agent (Phase 02) | — |
| `packages/database/src/repositories/*` | Database agent (Phase 02) | Read-only by all phases after |
| `packages/auth/*` | Auth agent (Phase 03) | Read-only after |
| `packages/ui/*` | UI agent (Phase 04) | Import by apps |
| `packages/shared/*` | Shared agent (Phase 04) | Import by all |
| `packages/validation/*` | Validation agent (Phase 04) | Import by all |
| `packages/seo/*` | SEO agent (Phase 14) | Import by apps/web |
| `packages/email/*` | Email agent (Phase 04) | Import by notifications |
| `packages/analytics/*` | Analytics agent (Phase 15) | Import by apps/web |
| `packages/cms/*` | CMS agent (Phase 06) | — |
| `packages/crm/*` | CRM agent (Phase 08) | — |
| `packages/search/*` | Search agent (Phase 13) | — |
| `packages/freelance/*` | Freelance agent (Phase 10-12) | — |
| `packages/events/*` | Events agent (Phase 11) | — |
| `packages/finance/*` | Finance agent (Phase 12) | — |
| `packages/portal/*` | Portal agent (Phase 12) | — |
| `packages/proposals/*` | Portal agent (Phase 12) | — |
| `packages/notifications/*` | Notifications agent (Phase 12) | — |

### 4.2 Conflict Prevention Rules

1. **No two agents edit the same file.** If work requires touching a shared file (e.g., root `tsconfig.json`), serialize access.
2. **API contracts are frozen.** Route handlers and response shapes are defined in `API_DESIGN.md` and must not change. If an agent needs a new field or endpoint, it must update the contract first and get signoff.
3. **Repository interfaces are frozen** after Phase 02. All agents consume repositories; none modify them.
4. **Package exports are additive only.** Never remove or rename an export from a shared package once created.
5. **Database migrations are append-only.** Never modify a committed migration. New phases create new migration files.
6. **Environment variables are additive only.** Never rename or remove an env var. Add new vars to `.env.example` and `ENVIRONMENT_VARIABLES.md`.

### 4.3 Merge Sequence

When merging parallel work:

1. **Phase 04 (Shared Packages) merges first** — all other phases depend on package imports
2. **Phase 06 (CMS) merges before Phase 10/11** — entrepreneur and artist systems consume CMS patterns
3. **Phase 16 (Public Website) merges last in Track 5** — it has the most downstream consumers
4. **Phase 12 (Client Portal) is highest-risk merge** — reconcile after Phase 06, 07, 08 are stable

### 4.4 Stub & Contract Pattern

When a phase depends on a package not yet built:

1. Define the **TypeScript interface** in the consuming phase
2. Create a **stub implementation** that returns `Promise.resolve(null)` or `[]`
3. When the dependency phase completes, **swap stub for real import**
4. Remove the stub file

**Stubs required at integration points:**

| Consumer Phase | Depends On | Stub Type |
|---------------|------------|-----------|
| Phase 06 (CMS) | Phase 07 (Media) | MediaPicker stub — returns null until Phase 07 |
| Phase 12 (Portal) | Phase 08 (CRM) | LeadRepository stub — for proposal→project creation |
| Phase 16 (Web) | Phase 06 (CMS) | ContentRepository import — real, not stub (Phase 06 completes before Phase 16) |
| Phase 13 (Search) | Phase 16 (Web) | SearchPage stub — renders after Phase 16 pages exist |

---

## 5. Resource Allocation

### 5.1 Single Agent Execution (Default)

Recommended for minimum cost and maximum consistency. Each phase is completed start-to-finish by one agent.

| Advantage | Disadvantage |
|-----------|-------------|
| Zero merge conflicts | ~185-220 sequential sessions |
| Maximum context retention | Longer wall-clock time (~12 weeks at 3 phases/week) |
| No knowledge transfer overhead | Single point of failure |

### 5.2 Multi-Agent Execution (Accelerated)

Recommended for speed. Multiple agents work parallel tracks.

**Recommended team composition:**

| Agent Role | Phases | Tracks |
|------------|--------|--------|
| Foundation Agent | 01-05 | Track 1 |
| CMS Agent | 06 | Track 2 |
| Media Agent | 07 | Track 2 |
| CRM Agent | 08-09 | Track 3 |
| Operations Agent | 10-12 | Track 4 |
| Website Agent | 16 | Track 5 |
| Search/SEO Agent | 13-15 | Track 5 |
| QA Agent | 17-20 | Track 6 |

**Parallel execution plan (3 agents):**

| Wave | Sessions | Agent 1 | Agent 2 | Agent 3 |
|------|----------|---------|---------|---------|
| Wave 1 | 12-16 | Phase 01 (6-8) | — | — |
| Wave 2 | 16-22 | Phase 02 (10-14) | Phase 04 (8-10) | — |
| Wave 3 | 14-20 | Phase 03 (6-8) | Phase 05 (6-8) | Phase 04 finish |
| Wave 4 | 20-28 | Phase 06 (12-16) | Phase 07 (6-8) | Phase 08 (8-12) |
| Wave 5 | 20-30 | Phase 10 (4-6) | Phase 11 (6-8) | Phase 09 (6-8) + Phase 12 start |
| Wave 6 | 20-30 | Phase 16 (14-20) | Phase 12 continued | Phase 13-15 (11-16) |
| Wave 7 | 16-24 | Phase 16 finish | Phase 17 (8-12) | Phase 13-15 finish |
| Wave 8 | 13-18 | Phase 18 (6-8) | Phase 17 finish | Phase 19 (4-6) |
| Wave 9 | 3-4 | Phase 20 (3-4) | — | — |

**Estimated wall-clock: 9 waves × ~2-3 days each = 3-4 weeks with 3 agents.**

### 5.3 Agent Skill Requirements

| Phase | Required Skills |
|-------|----------------|
| 01 | Turborepo, pnpm, TypeScript config, ESLint, GitHub Actions, Sentry |
| 02 | Drizzle ORM, Supabase PostgreSQL, schema design, repository pattern |
| 03 | Better Auth, session management, RBAC, middleware |
| 04 | shadcn/ui, Tailwind CSS, Zod, Resend, design tokens, React components |
| 05 | Next.js App Router, TanStack Router, responsive layout, auth guards |
| 06 | Tiptap rich text editor, CRUD patterns, content scheduling, DataTable |
| 07 | Cloudflare R2, S3 API, image optimization, media library UI |
| 08 | Lead pipeline state machine, kanban, SLA tracking, dashboard metrics |
| 09 | Dynamic form builder, drag-and-drop, spam protection, form analytics |
| 10 | CRUD patterns, venture/product management, entrepreneur profile |
| 11 | Release/event management, calendar, availability, artist profile |
| 12 | Token auth, messaging, file review, invoice PDF, proposal templates, notification dispatch, Telegram/WhatsApp API |
| 13 | PostgreSQL FTS, tsvector, search UI with debounce, highlighting |
| 14 | SEO metadata, JSON-LD, sitemap XML, redirect logic |
| 15 | Analytics scripts, Cloudflare Analytics, Clarity, Umami, Sentry perf |
| 16 | Server Components, ISR, responsive design, 30+ page types, identity switcher |
| 17 | Vitest, Playwright, aXe, Lighthouse CI, integration testing |
| 18 | Web Vitals, bundle analysis, CSP headers, caching strategy |
| 19 | Supabase production config, Cloudflare DNS, Vercel deploy |
| 20 | Production deployment, smoke testing, monitoring verification |

---

## 6. Risk Mitigation

### 6.1 High-Risk Phases

| Phase | Risk | Mitigation |
|-------|------|------------|
| Phase 02 (Database) | 72 tables — schema drift, migration failures | Batch by domain (8 batches), validate each before next |
| Phase 06 (CMS) | Rich text editor complexity, content scheduling race conditions | Use Tiptap (battle-tested), test scheduling with time-travel |
| Phase 12 (Client Portal) | 4 subsystems bundled, highest dependency count | Build sequentially: Portal shell → Finance → Proposals → Notifications |
| Phase 16 (Public Website) | 30+ page types, responsive across 3 breakpoints | Reusable section components; homepage pattern drives all others |
| Phase 17 (Testing) | Coverage breadth across 72 tables, 185 routes | Prioritize critical flows; expand coverage iteratively |

### 6.2 Architecture Freeze Violations

Architecture is frozen. If an implementation agent encounters a scenario not covered by the architecture docs:

1. **Do not improvise** — stop and flag
2. **Document the gap** — what's missing, why it matters
3. **Request CR-03** (Change Request) with proposed resolution
4. **Blocking** — only the architecture owner can approve CR-03s
5. **Non-blocking** — work around using stub/improvise within frozen boundaries

### 6.3 Quality Gates

| Gate | Location | Criteria | Blocks |
|------|----------|----------|--------|
| Phase 01 Exit | After Phase 01 | `pnpm build` passes | Phase 02 start |
| Phase 05 Exit | After Phase 05 | Dashboard renders with auth | Phase 06/07/08 start |
| Phase 12 Exit | After Phase 12 | Portal, finance, notifications working | Phase 16 full start |
| Phase 16 Exit | After Phase 16 | All pages render, LCP < 2s | Phase 13/14 start |
| Phase 17 Exit | After Phase 17 | > 80% coverage, E2E pass | Phase 18 start |
| Phase 19 Exit | After Phase 19 | Infra configured, runbook ready | Phase 20 start |

---

## 7. Handoff Protocol

When an agent completes a phase and hands off to the next:

1. **Exit criteria verified** — all acceptance criteria met, all tests passing
2. **State documented** — what was built, what decisions were made
3. **Known issues filed** — any tech debt or edge cases deferred
4. **Dependencies published** — packages built, migrations run, seed data loaded
5. **Next agent briefed** — summary of architecture decisions that affect the next phase

### 7.1 Phase Completion Checklist

```
□ All acceptance criteria met (from MASTERPLAN.md)
□ All tests passing (pnpm test, pnpm lint, pnpm typecheck)
□ No architecture freeze violations
□ All new environment variables documented in ENVIRONMENT_VARIABLES.md
□ All new API endpoints documented in API_DESIGN.md (if applicable)
□ Migration files committed (append-only)
□ Stubs removed (if applicable)
□ Cross-document references updated (if applicable)
```

---

## 8. Summary

| Metric | Single Agent | Multi-Agent (3) |
|--------|-------------|-----------------|
| Total Sessions | 185-220 | 134-170 |
| Wall-Clock Estimate | ~12 weeks | ~3-4 weeks |
| Merge Conflicts | None | Low (workspace isolation) |
| Context Consistency | High | Medium (handoffs needed) |
| Cost | Baseline | ~1.5x (agent coordination overhead) |
| Risk | Low | Medium (parallel merge conflicts) |
