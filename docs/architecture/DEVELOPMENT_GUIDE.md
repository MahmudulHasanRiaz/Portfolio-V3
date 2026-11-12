# Development Guide

> **PRD Reference:** [PRD.md](../PRD.md) — AI Agent Execution Plan, General AI Agent Rules  
> **Status:** Approved  
> **Version:** 1.0

---

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22.x LTS | Runtime |
| pnpm | 9.x | Package manager |
| PostgreSQL | 16.x | Local database |
| Docker | Latest | Local Supabase (optional) |
| Git | Latest | Version control |

---

## 2. Setup

### 2.1 Clone and Install

```bash
git clone <repo-url>
cd personal-brand-os
pnpm install
```

### 2.2 Environment Variables

```bash
# Copy template
cp .env.example .env.local

# Required variables
DATABASE_URL=postgresql://localhost:5432/personal_brand_os
BETTER_AUTH_SECRET=<generated-secret>
BETTER_AUTH_URL=http://localhost:3000
RESEND_API_KEY=<your-key>
R2_ENDPOINT=<r2-endpoint>
R2_ACCESS_KEY=<r2-key>
R2_SECRET_KEY=<r2-secret>
R2_BUCKET=personal-brand-os
```

### 2.3 Database Setup

```bash
# Push schema (development)
pnpm --filter database db:push

# Generate migration (production)
pnpm --filter database db:generate

# Apply migration
pnpm --filter database db:migrate

# Seed data
pnpm --filter database db:seed
```

### 2.4 Start Development

```bash
# All apps
pnpm dev

# Specific app
pnpm --filter web dev
pnpm --filter dashboard dev
pnpm --filter portal dev
```

---

## 3. Project Structure

```
root/
├── apps/
│   ├── web/              # Public website (Next.js 16, App Router)
│   ├── dashboard/        # Admin dashboard (Next.js 16 + TanStack Router)
│   ├── portal/           # Client portal (Next.js 16 + TanStack Router)
│   └── docs/             # Architecture documentation
├── packages/
│   ├── database/         # Drizzle schema, migrations, repositories
│   ├── validation/       # Zod schemas (shared)
│   ├── ui/               # Shared components (shadcn/ui)
│   ├── auth/             # Better Auth configuration
│   ├── seo/              # SEO utilities
│   ├── email/            # Resend integration
│   ├── notifications/    # Telegram/WhatsApp dispatch
│   ├── cms/              # Content management logic
│   ├── crm/              # CRM business logic
│   ├── search/           # PostgreSQL FTS interface
│   ├── freelance/        # Freelance project logic
│   ├── events/           # Artist event logic
│   ├── finance/          # Finance logic
│   ├── portal/           # Client portal logic
│   ├── proposals/        # Proposal template logic
│   ├── analytics/        # Analytics integration
│   └── shared/           # Shared types, constants, utilities
├── tooling/              # ESLint, Prettier, TypeScript configs
├── scripts/              # Automation scripts
└── .github/              # GitHub Actions workflows
```

---

## 4. Development Workflow

### 4.1 Branch Strategy

| Branch | Purpose | Deploy Target |
|--------|---------|---------------|
| `main` | Production | Vercel Production |
| `develop` | Integration | Vercel Preview (staging) |
| `feature/*` | Feature work | Vercel Preview (ephemeral) |
| `fix/*` | Bug fixes | Vercel Preview |
| `chore/*` | Tooling/config | Vercel Preview |

### 4.2 Feature Workflow

```
1. Create branch: feature/my-feature
2. Implement changes
3. Write/update tests
4. Run validation: pnpm lint && pnpm typecheck && pnpm test
5. Push and create PR → develop
6. PR validation runs (lint, typecheck, build, test)
7. Merge to develop (auto-deploys to staging)
8. Parity check on staging
9. Merge to main (auto-deploys to production)
```

### 4.3 Commit Convention

```
type(scope): description

Types: feat, fix, chore, docs, refactor, test, style
Scope: web, dashboard, portal, database, ui, auth, crm, etc.

Examples:
  feat(crm): add lead follow-up queue
  fix(database): correct project_categories migration
  chore(deps): upgrade TanStack Query to v5
```

---

## 5. Coding Standards

### 5.1 TypeScript

| Rule | Standard |
|------|----------|
| Strict Mode | Enabled in all packages |
| No `any` | Strict — use `unknown` if type is truly unknown |
| Imports | `@/` path aliases for package imports |
| Exports | Named exports only (no default exports) |
| Nullability | `undefined` preferred over `null` |

### 5.2 React/Next.js

| Rule | Standard |
|------|----------|
| Components | Server Components by default |
| Client Boundary | `'use client'` only when interactivity required |
| Props | TypeScript interfaces, PascalCase |
| State | TanStack Query for server state, useState for UI state |
| Forms | React Hook Form + Zod |
| Routing | Next.js App Router (web), TanStack Router (dashboard/portal) |

### 5.3 Database

| Rule | Standard |
|------|----------|
| ORM | Drizzle ORM for all database access |
| Pattern | Repository Pattern — never use Drizzle directly in apps |
| Migrations | Drizzle Kit generated, reviewed, applied in CI |
| Queries | All queries go through repository methods |
| Relations | Use Drizzle relations for joins |

### 5.4 API

| Rule | Standard |
|------|----------|
| Public website | Server Components fetch via repositories |
| Dashboard/Portal | Route Handlers (GET) + Server Actions (mutations) |
| Validation | Zod on every endpoint |
| Response Format | Uniform `{ success, data, meta }` or `{ success, message, errors }` |

---

## 6. Testing

### 6.1 Test Types

| Type | Tool | Coverage Target |
|------|------|-----------------|
| Unit | Vitest | Business logic, utilities, validators, repositories |
| Integration | Vitest | API endpoints, database operations |
| E2E | Playwright | Critical flows (homepage, contact, booking, login, CRM) |
| Accessibility | aXe (Playwright) | All public pages, key dashboard flows |
| Performance | Lighthouse CI | All public pages |

### 6.2 Test Command

```bash
# All tests
pnpm test

# Specific package
pnpm --filter database test

# E2E
pnpm --filter web test:e2e

# Coverage
pnpm test -- --coverage
```

### 6.3 Testing Conventions

- Tests live in `__tests__/` directory next to source
- Integration tests use a test database (separate from dev)
- E2E tests use Playwright with `playwright.config.ts` at app root
- API tests use `vitest` with `next-test-utils` or equivalent

---

## 7. Repository Pattern

### 7.1 Structure

```typescript
// packages/database/src/repositories/posts.repository.ts
import { db } from '../connection';
import { posts, postCategories } from '../schemas';
import { eq, and, desc } from 'drizzle-orm';
import { Post, CreatePostInput, PostFilters } from './types';

export class PostsRepository {
  async findById(id: string): Promise<Post | null> {
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id));
    return post || null;
  }

  async list(filters: PostFilters): Promise<{ data: Post[]; total: number }> {
    // Implementation
  }

  async create(input: CreatePostInput): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values(input)
      .returning();
    return post;
  }

  async update(id: string, input: Partial<Post>): Promise<Post> {
    const [post] = await db
      .update(posts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return post;
  }

  async delete(id: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }
}

export const postsRepository = new PostsRepository();
```

### 7.2 Rules

- Every table has a repository
- Repositories are stateless (no class properties beyond DB reference)
- Repository methods are async
- Repository methods never throw HTTP errors (throw AppError derivatives)
- Cross-entity operations use a service layer (not repositories calling repositories)

---

## 8. Package Architecture

### 8.1 Package Dependency Rules

```
apps/web         → packages: ui, database, auth, seo, email, cms, search, shared, validation
apps/dashboard   → packages: ui, database, auth, cms, crm, search, freelance, events, finance,
                   portal, proposals, notifications, analytics, shared, validation
apps/portal      → packages: ui, database, portal, finance, shared, validation
```

### 8.2 Package Development

```bash
# Build all packages
pnpm build

# Build specific package (with watch mode)
pnpm --filter database build --watch

# Lint all
pnpm lint

# Type check all
pnpm typecheck
```

---

## 9. Design System Development

### 9.1 Component Checklist

Every new UI component must include:

- [ ] TypeScript types
- [ ] Loading state
- [ ] Empty state (if list/data component)
- [ ] Error state (if data-fetching component)
- [ ] Accessibility (keyboard nav, screen reader labels, ARIA attributes)
- [ ] Mobile responsive
- [ ] Dark mode support
- [ ] `prefers-reduced-motion` support

### 9.2 shadcn/ui Additions

```bash
# Add a new shadcn/ui component
pnpm dlx shadcn@latest add button -c apps/dashboard

# Components are automatically added to packages/ui/src/components/ui/
```

---

## 10. Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Run ESLint across the entire monorepo |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run all tests |
| `pnpm format` | Format code with Prettier |
| `pnpm --filter database db:push` | Push schema to database |
| `pnpm --filter database db:seed` | Run database seeds |
