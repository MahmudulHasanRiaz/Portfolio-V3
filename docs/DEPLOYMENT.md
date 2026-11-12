# Deployment — incidents, rules, and pre-merge checks

How deploys work: Portfolio-Public goes to Cloudflare (GitHub Action
"Deploy to Cloudflare", manual). Portfolio-V2 (dashboard / portal / web)
goes to the Portainer stack `portfolio`, Git-managed, polling `main` every
2 min; it builds one Docker image (`npx turbo run build --concurrency=2`),
then runs migrations (the `migrate` service) and starts the apps. The
deploy procedure itself lives in `docs/DEPLOY_PORTAINER.md`.

## Incident 2026-11-10 — a "use server" file exported a const (PR #97)

**What broke.** `apps/dashboard/src/actions/directory.ts` starts with
`"use server"` and exported `TECHNOLOGY_CATEGORIES`, a const array. Next.js
allows a `"use server"` file to export ONLY async functions (and types).
`next build` failed while collecting page data:

```
Error: Failed to collect page data for /dashboard/clients
A "use server" file can only export async functions, found object.
```

**Consequence.** Every Portainer redeploy after PR #95 failed and the stack
stayed on commit `c80241a`; migrations 0031–0034 could not land and the
Bangla data behind them never reached the live admin API.

**Why it was not caught.** The code is valid TypeScript (`tsc` passes), the
dashboard has `typescript.ignoreBuildErrors: true`, and the rule is enforced
ONLY by Next.js at build time. No local check ran `next build` before merge.

**Fix.** The const and its derived type moved to a plain module,
`apps/dashboard/src/lib/technology-categories.ts`; the server action and the
form import it from there.

**RULE — never export a value (const, object, array, non-async function)
from a `"use server"` file.** Shared constants belong in a plain module
under `src/lib/` (or a package). Async functions and `type`/`interface`
exports are fine. Before merging ANY change to a server-action file, run the
full build below.

## Incident (earlier) — VPS build OOM

**What happened.** The Docker build OOM-killed a Next.js build worker on the
shared VPS: `npm run build` exit 1 in Portainer while the same build passed
locally.

**Mitigation (in the `Dockerfile`).**
`NODE_OPTIONS=--max-old-space-size=2048` and
`npx turbo run build --concurrency=2`.

**If it comes back.** Check the VPS free memory first; lower the concurrency
to 1 (or raise the heap only if the VPS has room). Do NOT just re-trigger the
deploy and hope. If the build grows (more pages), the heap / concurrency may
need revisiting — and that change belongs in the `Dockerfile`, with a comment
saying why.

## Push rule — never base64, verify by blob SHA

The GitHub push tooling stores the `content` field LITERALLY — always push
RAW file text, never base64. (Base64 payloads committed in PRs #24–#26 broke
the Portainer build and were repaired in PR #27.)

Verify every push by comparing the API-reported blob SHA against the local
git blob SHA: `sha1("blob <len>\0" + bytes)`. Never verify by reading the
file content back — the API double-decodes, so a base64-stored file looks
correct when read back.

Never race `create_branch` with `push_files` for the same branch; let
`push_files` create the branch.

## Pre-merge checklist (every PR)

1. Run the full build the same way the `Dockerfile` does (from the repo root):

   ```bash
   DATABASE_URL=postgresql://user:pass@localhost:5432/db \
     NODE_OPTIONS=--max-old-space-size=2048 \
     npx turbo run build --concurrency=2
   ```

   All 23 tasks must pass, including the dashboard, portal, and web
   `next build`. A passing `tsc` is NOT a substitute — see the 2026-11-10
   incident above.

2. After merge, confirm in Portainer that the stack's commit advanced past
   the merged commit. A successful GitHub merge is NOT a successful deploy.
   If the stack stays on the old commit, read the Portainer error: a
   `compose build` failure is a build problem (this doc), a `migrate`
   failure is a migration problem — do not confuse the two.
