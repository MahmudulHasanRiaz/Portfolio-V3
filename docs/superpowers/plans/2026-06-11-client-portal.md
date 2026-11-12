# Client Portal (Phase 11) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do NOT reorder tasks.

**Goal:** Build a secure client-facing portal with project visibility, deliverables workflow, proposals, files, invoice visibility, and activity feed — plus the corresponding dashboard admin management pages and freelance project management.

**Architecture:** The portal is a separate Next.js app (`apps/portal/`) with its own middleware using `portal_sessions` token-based auth (not Better Auth). Business logic lives in `packages/portal-pkg/` as repository classes. The dashboard (`apps/dashboard/`) gets new freelance project management pages and portal admin management pages. No new DB tables needed — all tables already exist in `packages/database/src/schema/freelance/`, `finance/`, `portal/`.

**Tech Stack:** Next.js 16, React 19, `postgres` (raw SQL repositories), `@repo/ui` components, CSS variable tokens, `@repo/media` for file access, `bcryptjs` for password hashing, `jsonwebtoken` for portal sessions.

---

## File Structure

### Packages Created/Modified

```
packages/portal-pkg/                  # Business logic package (was packages/portal/)
  src/
    index.ts                          # Factory + exports
    errors.ts                         # Portal-specific errors
    types.ts                          # Shared types
    portal-auth-repository.ts         # Portal session auth
    project-repository.ts             # Freelance project queries (client-scoped)
    milestone-repository.ts           # Milestone queries (client-scoped)
    deliverable-repository.ts         # Deliverable queries + client feedback
    proposal-repository.ts            # Proposal view/accept/reject
    message-repository.ts             # Portal messaging
    activity-repository.ts            # Activity feed
    invoice-repository.ts             # Invoice visibility
```

### Portal App Created/Modified

```
apps/portal/
  src/
    middleware.ts
    app/
      layout.tsx
      globals.css
      client-providers.tsx
      page.tsx
      login/page.tsx
      setup/page.tsx
      dashboard/layout.tsx
      dashboard/page.tsx
      projects/[id]/page.tsx
      deliverables/page.tsx
      deliverables/[id]/page.tsx
      proposals/page.tsx
      proposals/[id]/page.tsx
      messages/page.tsx
      invoices/page.tsx
      invoices/[id]/page.tsx
      api/auth/login/route.ts
      api/auth/verify/route.ts
      api/auth/setup/route.ts
      api/projects/route.ts
      api/projects/[id]/route.ts
      api/projects/[id]/milestones/route.ts
      api/projects/[id]/deliverables/route.ts
      api/projects/[id]/deliverables/[did]/feedback/route.ts
      api/projects/[id]/activities/route.ts
      api/deliverables/route.ts
      api/deliverables/[id]/route.ts
      api/proposals/route.ts
      api/proposals/[id]/route.ts
      api/proposals/[id]/accept/route.ts
      api/proposals/[id]/reject/route.ts
      api/messages/route.ts
      api/invoices/route.ts
      api/invoices/[id]/route.ts
```

### Dashboard App Modified/Created

```
apps/dashboard/src/
  app/dashboard/
    freelance/
      layout.tsx
      page.tsx
      new/page.tsx
      [id]/page.tsx
      [id]/edit/page.tsx
    portal/
      layout.tsx
      page.tsx
      [id]/page.tsx
  app/api/
    freelance/projects/route.ts
    freelance/projects/[id]/route.ts
    freelance/projects/[id]/milestones/route.ts
    freelance/projects/[id]/milestones/[mid]/route.ts
    freelance/projects/[id]/deliverables/route.ts
    freelance/projects/[id]/deliverables/[did]/route.ts
    freelance/projects/[id]/activities/route.ts
    freelance/projects/[id]/portal/route.ts
    portal/sessions/route.ts
    portal/sessions/[id]/route.ts
    portal/sessions/[id]/regenerate-token/route.ts
    portal/sessions/[id]/disable/route.ts
```


## Task List Overview

### Task 1: Portal Package — Core + Auth Repository
Create errors.ts, types.ts, portal-auth-repository.ts, index.ts, update package.json.

### Task 2: Portal Package — Project, Milestone, Deliverable Repositories
Create project-repository.ts, milestone-repository.ts, deliverable-repository.ts.

### Task 3: Portal Package — Proposal, Message, Activity, Invoice Repositories
Create proposal-repository.ts, message-repository.ts, activity-repository.ts, invoice-repository.ts. Verify typecheck.

### Task 4: Portal App — Scaffold + Middleware + Auth Pages + Auth API Routes
Create globals.css, layout.tsx, client-providers.tsx, middleware.ts, root page, login page, setup page, auth API routes.

### Task 5: Dashboard App — Freelance Projects Management (Pages + API Routes)
Create freelance list, create, detail, edit pages + all freelance API routes.

### Task 6: Dashboard App — Portal Management (Pages + API Routes)
Create portal sessions list, detail pages + portal API routes.

### Task 7: Portal App — Dashboard + Project + Deliverables Pages + API Routes
Create dashboard landing page, project detail, deliverables list/detail, and corresponding portal API routes.

### Task 8: Portal App — Proposals + Messages + Invoices Pages + API Routes
Create proposals list/detail, messages page, invoices list/detail, and corresponding portal API routes.

### Task 9: Verify + Final Checks
Typecheck both apps, verify dashboard navigation, create deliverable reports.

---
