# Build guard — why the Docker build fails and how we stop it coming back

Read this before you touch any TypeScript in this repo, especially in
`packages/database`. A one-line-looking change here has broken the deploy
twice. This note records the failure class, the incidents, and the rule
that prevents the next one.

## The failure class

**A TypeScript error in a shared package breaks the Portainer Docker build.**

`turbo run build` runs `tsc` for every package and `next build` for every
app. Any package whose build fails makes `turbo run build` exit 2, and the
Docker build fails with:

```
failed to deploy a stack: compose build operation failed: failed to solve:
process "/bin/sh -c npx turbo run build --concurrency=2" did not complete
successfully: exit code: 2
```

That one line is ALL Portainer reports — there is no build log. You cannot
see which task failed or why from Portainer. The failure must be reproduced
locally (see "How to reproduce" below).

### Why a file can pass its own package's check and still break the build

Three facts combine into the trap:

1. `tooling/typescript/base.json` sets `"noUnusedLocals": true` (and
   `"noUnusedParameters": true`). Packages inherit this unless they opt out.
2. `packages/database/tsconfig.json` opts OUT (`"noUnusedLocals": false`,
   `"noUnusedParameters": false`), so the database package's own `tsc`
   build passes even with dead imports.
3. `packages/database/package.json` points `"main"` and `"types"` at
   `"./src/index.ts"` — the SOURCE, not a built `dist`. Every package that
   imports `@repo/database` therefore type-checks the database source files
   under **its own** compiler options. A strict consumer
   (`packages/entrepreneur`, which does not opt out) fails on the same
   files the database package itself accepts.

So: **clean under `packages/database`, broken under `@repo/entrepreneur`.**
The dashboard cannot save you either — it sets
`typescript.ignoreBuildErrors: true` — and web/portal set
`noUnusedLocals: false`, so the error surfaces only in the strict
packages. Never assume "my package builds, so the build is fine."

## Incidents

### 2026-11-11 — barrel re-export without import (PR #104 → PR #105)

- PR #104 (squash-merged `b6d86854`) added `getSql` and `closeDb` to the
  export list of `packages/database/src/index.ts` without importing them
  from `./connection` (line 1 imported only `getDb`).
- Result: `tsc` TS2304 ×2 (`Cannot find name 'getSql'` / `'closeDb'`),
  `@repo/database#build` failed, `turbo run build` exit 2, deploy failed.
- Fix: PR #105 (squash-merged `a49bf4d7`, branch `fix/v2-turbo-build`) —
  one line: `import { getDb, getSql, closeDb } from "./connection";`.

### 2026-11-12 — 83 unused imports in the database schema (PR #106, this fix)

- Main head `a49bf4d7` (with the PR #105 fix in it) still failed the
  Portainer build with the same exit-code-2 error, via auto-pull AND via a
  manual redeploy. The deploy had never succeeded on any commit after
  `0ec7f9f2`.
- Reproduced locally with the exact Docker command (see below):
  `@repo/entrepreneur#build` failed with **83× `error TS6133`** — unused
  `drizzle-orm/pg-core` import specifiers (`integer`, `date`,
  `primaryKey`, `boolean`, `timestamp`, `jsonb`, `text`, `varchar`) in
  **21 files** under `packages/database/src/schema/` (17 in
  `schema/content/`, plus `schema/crm/leads.ts`,
  `schema/freelance/projects-freelance.ts`,
  `schema/proposals/proposal-templates.ts`,
  `schema/workflows/workflow-runs.ts`). Every error is on line 1: the
  files were written with the same copy-pasted boilerplate import line and
  each uses only a subset of it.
- The dead imports are OLD — e.g. `schema/content/tags.ts` was last
  touched 2026-06-10 (`0f851cb07`). They predate the failure by months.
  The build passed at `0ec7f9f2`; the exact change in PR #104 / PR #105
  that exposed them was not definitively isolated (most likely the
  database edits changed which files land in consumers' `tsc` programs /
  invalidated the turbo cache that had been masking them). What is proven
  is the mechanism above and the fix below.
- Fix (branch `fix/v2-turbo-build-2`): removed exactly the 83 unused
  specifiers from the 21 files — mechanical, no behaviour change, no
  tsconfig weakening. The strict checks stay on. Verified by a full local
  build: **23 tasks successful, 23 total** (see below).

Earlier instances of the same class: `95e2c38069` (#68, TS2322, web),
`eb0ae5cbc9` (TS literal widening, web), `ab3a2fa80c` (#102, `use server`
export, dashboard). Same shape every time: a type error somewhere in the
monorepo, deploy fails, Portainer shows one line.

## The rule

**Never merge without the FULL local `turbo run build` passing, or the
Build workflow green on the PR. Partial / subset typechecks do not catch
this.** Checking `packages/database` alone is not enough (its own config
is lax); checking one app is not enough (the dashboard ignores build
errors); checking only changed files is not enough (the error lives in a
file the change merely pulls into another package's program).

## How to reproduce (the exact Docker build)

From the repo root, with dependencies installed exactly as the Dockerfile
does (`npm ci`):

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/db \
  NODE_OPTIONS=--max-old-space-size=2048 \
  NEXT_TELEMETRY_DISABLED=1 \
  NEXT_PUBLIC_URL=http://localhost:3002 \
  NEXT_PUBLIC_SITE_NAME="Mahmudul Hasan Riaz" \
  NEXT_PUBLIC_SITE_DESCRIPTION="Software Engineer, Entrepreneur, Islamic Artist" \
  npx turbo run build --concurrency=2
```

All 23 tasks must pass. The `DATABASE_URL` value is the same placeholder
the Dockerfile uses — the build only validates its format; queries fail
soft during page-data collection (you will see `[PublicProfile] Failed to
load profile` / `DB query failed` lines in the web build output — that is
expected with no real database, not a failure). A real failure looks like
`error TSxxxx` lines under a `<package>:build` task and ends with
`Failed: @repo/<name>#build` / `run failed: command exited (2)`.

## The guard

- `.github/workflows/ci.yml` ("PR Validation") runs this exact build on
  every PR to main. It is deliberately BUILD-ONLY: the old lint /
  typecheck / test job stays out because the dashboard typecheck has
  ~142 pre-existing errors that must be baselined separately first. Do not
  re-add those steps until the dashboard typecheck is green.
- If the Build workflow is red, do not merge — reproduce locally with the
  command above, fix what `tsc` / `next build` reports, and re-run the
  FULL build (not a subset) until it is green.

## Public-site cache purge (admin → Astro live, 2026-11-12)

The public site (Portfolio-Public, Astro SSR) caches every content page
at the Cloudflare edge for **1 hour** — repeat visits are edge hits
instead of ~5 s cold Worker renders (measured 2026-11-12: homepage TTFB
4.87 s plain / 5.80 s fresh). Freshness comes from the **tag purge**, not
from a short TTL: after every successful admin content save, the admin
POSTs the affected tags to the public site's
`POST /api/cache/invalidate`, and the edit appears live within seconds —
no rebuild, no deploy.

- The helper is `purgePublicCache(tags)` in `packages/shared/src/public-cache.ts`.
  It is best-effort and NEVER throws: a failed or unconfigured purge must
  NEVER fail an admin save (the worst case is a page stale up to the 1 h
  TTL). Callers fire-and-forget it (`void purgePublicCache([...])`) AFTER
  the DB write succeeds. Never `await` it in a save path.
- Purged on: `ContentService` create/update/delete/transition (projects,
  posts, case-studies → their tag + "home"; pages/services → "home"),
  `HomepageService` update/reorder/toggle/restore (→ "home"), ventures +
  releases API routes (→ their tag + "home"), site-copy + the five
  public-settings PUTs (→ "home"), directory actions for platforms /
  technologies / clients (→ "home"). The homepage carries every content
  tag, so any content purge refreshes it too.
- Config (admin env, Portainer): `PUBLIC_SITE_URL` (the public Worker
  origin) + `CACHE_INVALIDATE_SECRET` (must match the Cloudflare
  dashboard secret of the same name on the public Worker). No Cloudflare
  API token or zone ID is needed — the endpoint purges through Astro's
  cache API (Workers Cache purge-by-tag). If either var is unset, the
  helper logs ONE warning per process and no-ops; saves still succeed.
- If an admin edit does not show live within seconds: (1) check the admin
  log for a `[public-cache]` warning, (2) check the secret matches on both
  sides, (3) check `PUBLIC_SITE_URL` points at the public Worker.
- Known gap: release/venture SUB-resources (platforms, videos, lyrics,
  timeline, media, categories) do not purge yet — their edits go stale at
  most 1 h. Wire the purge at those save paths instead of shortening the TTL.

## Related docs

- `docs/DEPLOYMENT.md` — deploy incidents, the `use server` rule, and the
  pre-merge checklist (including "confirm in Portainer that the stack's
  commit advanced past the merged commit").
- `docs/DEPLOY_PORTAINER.md` — the Portainer stack setup (builds from
  `refs/heads/main`, auto-pull every 2 min).
