# Portfolio V3 — pinned versions

**Pinned:** 2026-11-13 (scaffold, Phase 1). All versions are the latest
major + minor available on npm on that date, per the V3 version policy.
Re-verify with `npm view <pkg> version` before any future bump; record the
new date and the reason.

## Core

| Technology | Pinned | Notes |
|---|---|---|
| Node | 24 LTS (engines `>=22`) | Sandbox runs v24.22.1 |
| npm | 11.13.0 (`packageManager`, unchanged from V2) | Deliberately NOT bumped to npm 12 — the sandbox and CI run npm 10/11; the lockfile format is identical (v3). Revisit when the toolchain moves. |
| TypeScript | **7.0.2** | The new native port. Only stable 7.x release (7.0.1-rc, 7.1.0-beta/dev only). See the peer-lag note below. |
| Turborepo | 2.11.11 | |
| Prettier | 3.10.1 | |

## Apps

| Technology | Pinned | Notes |
|---|---|---|
| Astro | 7.4.11 | apps/public |
| @astrojs/cloudflare | 14.4.7 | apps/public |
| @astrojs/preact | 6.1.5 | apps/public |
| @astrojs/check | 0.9.12 | apps/public — see peer-lag note |
| Wrangler | 4.161.0 | apps/public |
| @cloudflare/workers-types | 5.20261112.1 | apps/public |
| Next.js | 16.4.6 | apps/admin, apps/portal |
| React / React DOM | 19.3.1 | + @types/react, @types/react-dom 19.3.0 |
| @opennextjs/cloudflare | 1.20.17 | apps/admin (devDep) — admin deploys via OpenNext. Peers: next `>=16.4.5`, wrangler `^4.148.0` — both satisfied. Portal gets it in its own phase. |
| Tailwind CSS | 4.3.5 | + @tailwindcss/postcss 4.3.5 |
| @sentry/nextjs | 11.12.0 | apps/admin; peers next `^16.0.0-0` — satisfied. |

## Backend / data

| Technology | Pinned | Notes |
|---|---|---|
| Better Auth | 1.7.22 | root + packages/auth |
| Drizzle ORM | 0.45.4 | + drizzle-kit 0.31.11 |
| postgres (postgres.js) | 4.1.1 | Major 3→4. Drizzle 0.45.4 peers on `postgres >=3` — satisfied. |
| Zod | 4.6.7 | Major 3→4. Used by validation, database config, shared env, cms types. |
| bcryptjs / @types/bcryptjs | 3.0.3 / 3.0.0 | |
| jsonwebtoken / @types | 9.0.3 / 9.0.10 | |
| mime-types / @types | 3.0.2 / 3.0.1 | Major 2→3, paired. |
| @aws-sdk/client-s3, s3-request-presigner | 3.1167.0 | packages/media (R2) |

## UI

| Technology | Pinned | Notes |
|---|---|---|
| lucide-react | 1.72.0 | Major 0.x→1.x for apps/portal; 1.17/1.70→1.72 elsewhere. |
| @tanstack/react-table | 9.3.1 | Major 8→9. |
| Radix UI primitives | latest 1.x/2.x minors (see package.json) | e.g. dialog 1.3.1, dropdown-menu 2.2.1, select 2.4.1. |
| sharp | 0.35.5 | packages/media |
| cmdk / clsx / class-variance-authority | 1.1.1 / 2.1.1 / 0.7.1 | Already latest. |
| preact | 11.2.0 | apps/public islands (already latest). |
| simple-icons | 16.37.0 | Already latest. |
| @fontsource/* | 5.3.0 | Already latest. |

## Tooling

| Technology | Pinned | Notes |
|---|---|---|
| ESLint | 10.14.0 | Major 9→10. + @eslint/js 10.0.1, typescript-eslint 8.72.2. |
| typescript-eslint | 8.72.2 | Peers on eslint `^8\|\|^9\|\|^10` — satisfied. Peers on typescript `<6.1.0` — see peer-lag note. |

## Known exceptions to "latest major"

1. **tooling/eslint keeps TypeScript ^5.8.0** (not 7.0.2). typescript-eslint
   8.72.2 (latest) declares a peer on `typescript <6.1.0`, so the eslint
   toolchain cannot use TS 7 yet. The rest of the repo uses TS 7.0.2.
   Revisit when typescript-eslint declares TS 7 support.
2. **@types/node is ^24.0.0**, not the latest 26.x — the types must match
   the Node 24 LTS runtime, not the Node 26 current release.
3. **npm stays at 11.13.0** (see Core table above).

## TypeScript 7 peer lag (why `.npmrc` sets `legacy-peer-deps=true`)

Three latest packages still declare peer ranges that exclude TS 7, so a
strict `npm install` fails with ERESOLVE even though nothing in the build
path actually breaks:

- `@astrojs/check@0.9.12` — peer `typescript ^5.0.0 || ^6.0.0`.
- `typescript-eslint@8.72.2` — peer `typescript >=4.8.4 <6.1.0`.
- `@sveltejs/kit@3.2.0` (peerOptional of better-auth 1.7.22) — peer
  `typescript ^6.0.0`. TS 6 was never released as stable (5.9 → 7.0),
  so that range matches nothing at all. SvelteKit is unused here
  (better-auth runs on Next.js); the peer is never installed.

None of these is in the build path (`tsc` for packages, `next build` for
the Next apps, `astro build` for the public site). The full local build
(`npx turbo run build --concurrency=2`) is the verification that TS 7
actually works — it passed on 2026-11-13 (see docs/BUILD_GUARD.md).

**Remove `legacy-peer-deps=true` from `.npmrc` once those packages declare
TS 7 support, then re-install without the flag and confirm the tree still
resolves.** Until then, plain `npm install` needs the flag (it is the repo
default via `.npmrc`, so no flag is needed in practice).
