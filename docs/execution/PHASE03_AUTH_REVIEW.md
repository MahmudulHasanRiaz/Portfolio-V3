# Phase 03 — Authentication & RBAC Review

**Date:** 2026-06-11
**Status:** Ready for Implementation

## Reviewed Documents
- [PRD.md](../PRD.md) — Security Architecture, Authentication, RBAC
- [RBAC.md](../architecture/RBAC.md) — Role hierarchy, permission registry, enforcement patterns
- [ROUTES.md](../architecture/ROUTES.md) — All 185 routes with auth requirements
- [API_DESIGN.md](../architecture/API_DESIGN.md) — Auth endpoints, response format, error codes
- [SYSTEM_ARCHITECTURE.md](../architecture/SYSTEM_ARCHITECTURE.md) — Monorepo structure, package deps
- [SECURITY.md](../architecture/SECURITY.md) — Session management, password policy, route protection layers
- [MASTERPLAN.md](../execution/MASTERPLAN.md) — Phase 03 tasks T3.1–T3.5
- [MULTI_AGENT_PLAN.md](../execution/MULTI_AGENT_PLAN.md) — Agent FE responsibilities

## Existing Assets (Phase 02)
- `packages/database/src/schema/identity/` — Users, sessions, accounts, verification_tokens, roles, permissions, role_permissions, user_roles tables
- `packages/database/src/seed/identity.ts` — 56 permissions, 10 roles, 1 admin user seeded
- `packages/database/src/repository/` — Repositories for identity domain
- `packages/auth/` — Stub package (empty `src/index.ts`)

## Architecture Decision

### Auth Provider: Better Auth
Better Auth (better-auth.com) will be integrated as follows:

**Auth Tables** (managed by Better Auth's Drizzle adapter):
- `user` — Better Auth's user table (text PK, email, hashedPassword in account table)
- `session` — Better Auth's session table  
- `account` — Better Auth's account table (stores password hash for email/password)
- `verification` — Better Auth's verification table

**RBAC Tables** (our existing identity domain, unchanged):
- `users` — Our app user table (uuid PK, linked to profiles, roles)
- `roles` — 10 roles per RBAC.md
- `permissions` — 52+ permissions per RBAC.md
- `role_permissions` — Role-permission mapping
- `user_roles` — User-role assignment

**Sync Mechanism**: Better Auth user creation triggers creation of corresponding record in our `users` table (via hook). Our `users` table drives all RBAC decisions.

### Why Separate Auth Tables?
- Our existing `users` table uses `uuid` PK referenced by 10+ FK tables (profiles, roles, sessions, etc.)
- Better Auth requires `text` PK and specific column structure
- Separation avoids cascading schema changes to existing tables
- Clean ownership: Better Auth owns auth, our app owns RBAC

## Implementation Plan

### T3.1 — Better Auth Schema & Configuration
- Add Better Auth tables (`better-auth` domain) to database package
- Create auth server configuration in `packages/auth/src/auth.ts`
- Drizzle adapter pointing to our Postgres connection
- Email/password authentication enabled
- Session config (7-day expiry, HTTP-only cookies)

### T3.2 — RBAC Service
- Create `packages/auth/src/lib/permissions.ts` — `hasPermission()`, `requirePermission()`
- Create `packages/auth/src/lib/roles.ts` — `hasRole()`, `requireRole()`
- Cache permissions per session to avoid DB calls on every check
- Sync hook: auto-create `users` record on Better Auth registration

### T3.3 — Auth API Routes
- `POST /api/auth/login` → Better Auth handler
- `POST /api/auth/logout` → Better Auth handler
- `POST /api/auth/register` → Better Auth handler (admin only)
- `GET /api/auth/session` → Current session + permissions

### T3.4 — Auth Middleware & Route Protection
- Next.js middleware: check session, redirect unauthenticated to `/login`
- `requirePermission(permissionId)` — throw ForbiddenError if missing
- Dashboard layout: permission-based sidebar nav filtering
- API route wrapper: `withPermission` higher-order handler

### T3.5 — Auth UI Components
- Login page at `/dashboard/login`
- Logout button in dashboard topbar
- Session indicator
- `Can` component (conditional render based on permission)
- `usePermissions()` hook

### T3.6 — RBAC Seed Update
- Update identity seed to use Better Auth user creation flow
- Seed roles and permissions matching RBAC.md exactly

## Security Checklist
- [ ] HTTP-only cookies for session
- [ ] CSRF protection
- [ ] Rate limiting on auth endpoints
- [ ] bcrypt password hashing (cost 12)
- [ ] Session expiry (7 days)
- [ ] No hardcoded permissions
- [ ] All authorization via centralized permission service

## Validation Plan
1. Build passes (`pnpm build`)
2. Type check passes (`pnpm typecheck`)
3. Migration applies to Supabase
4. Login creates session
5. Logout destroys session
6. Permission checks block unauthorized access
7. Protected routes redirect unauthenticated
8. Dashboard nav filters by permissions
