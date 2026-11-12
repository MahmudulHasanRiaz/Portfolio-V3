# Phase 16.1 — Workflow Trigger Integration Report

## Overview

Six trigger points were wired into production code paths, connecting the Phase 16 workflow engine to real entity-creation and state-change operations across four application domains:

| Domain | Trigger Type | Fire Point | File |
|---|---|---|---|
| CRM | `lead_created` | After `POST /api/leads` creates a lead | `apps/dashboard/src/app/api/leads/route.ts:54` |
| CRM | `lead_status_changed` | After `POST /api/leads/[id]/status` changes status | `apps/dashboard/src/app/api/leads/[id]/status/route.ts:25` |
| CMS | `content_published` | After create/update/transition results in `status: "published"` | `apps/dashboard/src/actions/content.ts:36,46,64` |
| Entrepreneur | `venture_published` | After `POST /api/ventures` creates a venture | `apps/dashboard/src/app/api/ventures/route.ts:55` |
| Artist | `release_published` | After `POST /api/releases` creates a release | `apps/dashboard/src/app/api/releases/route.ts:52` |
| Portal | `proposal_accepted` | After `POST /api/proposals/[id]/accept` accepts a proposal | `apps/portal/src/app/api/proposals/[id]/accept/route.ts:35` |

---

## Integration Pattern

Each integration uses the same `dispatchTrigger` helper:

```ts
import { dispatchTrigger } from "@repo/workflows";

// After successful persistence:
await dispatchTrigger(dbUrl, "lead_created", entity.id, { ...entity, triggeredBy: userId });
```

The helper (defined in `packages/workflows/src/index.ts`) wraps the `TriggerRegistry` with error handling:

```ts
export async function dispatchTrigger(
  connectionString: string,
  triggerType: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const svc = createWorkflowService(connectionString);
    await svc.triggerRegistry.dispatch({ triggerType, entityId, payload });
    await svc.sql.end({ timeout: 5 });
  } catch (err) {
    console.error(`[Workflow] Failed to dispatch ${triggerType}:`, err);
  }
}
```

**Design decisions:**
- **Error-isolated**: Workflow dispatch failures never break the primary operation. Errors are logged and swallowed.
- **Awaited (not fire-and-forget)**: The dispatch completes before the HTTP response is sent, ensuring runs are created even under light concurrency.
- **Separate connection**: Each dispatch opens a lightweight postgres pool, dispatches, and closes it. No shared connection state with the domain repository.
- **Duplicate-safe**: Each dispatch is called exactly once per successful persistence path. Since `TriggerRegistry.dispatch()` always creates a new `workflow_runs` row, duplicate dispatches would merely create extra pending runs — but no code path calls dispatch more than once.

---

## Transaction Safety

None of the existing route handlers wrap their operations in explicit DB transactions. Entity persistence and workflow dispatch are separate `INSERT`/`UPDATE` statements — they cannot be atomically rolled back together without adding `BEGIN`/`COMMIT` wrappers.

The current approach maintains the existing safety level:
- **Entity creation succeeds** → trigger dispatch fires
- **Entity creation fails** → exception thrown, dispatch never reached
- **Dispatch fails** → entity change is unaffected, error is logged

This is the same pattern used by the existing search indexer (`searchIndexer.indexEntity(...).catch(() => {})`).

---

## Per-Integration Detail

### 1. CRM — `lead_created`

**File:** `apps/dashboard/src/app/api/leads/route.ts`
**Line:** 54

```ts
const lead = await leads.create({ ...leadData, createdBy: session.user.id });
await activities.log(lead.id, "lead_created", ...);
await dispatchTrigger(dbUrl, "lead_created", lead.id, { ...lead, triggeredBy: session.user.id });
// ... visitor attribution ...
```

Trigger fires after the lead row is committed and the activity log is written. The full lead object (including `id`, `name`, `email`, `source`, `status`) is passed as the trigger payload.

### 2. CRM — `lead_status_changed`

**File:** `apps/dashboard/src/app/api/leads/[id]/status/route.ts`
**Line:** 25

```ts
const lead = await leads.changeStatus(id, newStatus);
if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
await activities.log(id, "status_changed", ...);
await dispatchTrigger(dbUrl, "lead_status_changed", id, { lead, newStatus, triggeredBy: session.user.id });
```

Trigger fires after the status change is committed. The payload includes both the updated lead and the new status value.

### 3. CMS — `content_published`

**Files:** `apps/dashboard/src/actions/content.ts`
**Lines:** 36, 46, 64

Three server-action paths fire the trigger when the resulting content status is `"published"`:

```ts
// createContent (line 36):
const result = await service.create(data, userId);
if ((result as any)?.status === "published") {
  await dispatchTrigger(process.env.DATABASE_URL!, "content_published", result.id, { ...result, contentType: type, triggeredBy: userId });
}

// updateContent (line 46):
const result = await service.update(id, data, userId);
if ((result as any)?.status === "published") {
  await dispatchTrigger(process.env.DATABASE_URL!, "content_published", id, { ...result, contentType: type, triggeredBy: userId });
}

// transitionContent (line 64):
const result = await service.transition(id, action);
if ((result as any)?.status === "published") {
  await dispatchTrigger(process.env.DATABASE_URL!, "content_published", id, { ...result, contentType: type, action, triggeredBy: userId });
}
```

Note: `createContent` and `updateContent` may fire when content is both created-as-published or updated-to-published. `transitionContent` fires on explicit publish workflow actions (including "publish" and "approve", which both map to `status: "published"`).

### 4. Entrepreneur — `venture_published`

**File:** `apps/dashboard/src/app/api/ventures/route.ts`
**Line:** 55

```ts
const venture = await ventures.create({ ...body, createdBy: session.user.id });
searchIndexer.indexEntity("venture", venture.id).catch(() => {});
await dispatchTrigger(dbUrl, "venture_published", venture.id, { ...venture, triggeredBy: session.user.id });
```

Trigger fires after venture creation and search indexing (fire-and-forget). The full venture object is the payload.

### 5. Artist — `release_published`

**File:** `apps/dashboard/src/app/api/releases/route.ts`
**Line:** 52

```ts
const release = await releases.create({ ...body, createdBy: session.user.id });
searchIndexer.indexEntity("release", release.id).catch(() => {});
await dispatchTrigger(dbUrl, "release_published", release.id, { ...release, triggeredBy: session.user.id });
```

Trigger fires after release creation and search indexing. The full release object is the payload.

### 6. Portal — `proposal_accepted`

**File:** `apps/portal/src/app/api/proposals/[id]/accept/route.ts`
**Line:** 35

```ts
const updated = await repo.proposals.accept(id);
// ... activity log ...
await dispatchTrigger(dbUrl, "proposal_accepted", id, { ...updated, triggeredBy: payload.clientId });
```

Trigger fires after the proposal is accepted (status changed to `"accepted"`) and the activity is logged. The `triggeredBy` is the JWT-authenticated client ID from the portal session token.

---

## Files Modified

| File | Change |
|---|---|
| `packages/workflows/src/index.ts` | Added `dispatchTrigger()` helper function |
| `apps/dashboard/package.json` | Added `@repo/workflows` dependency |
| `apps/portal/package.json` | Added `@repo/workflows` dependency |
| `apps/dashboard/src/app/api/leads/route.ts` | Added `lead_created` trigger dispatch |
| `apps/dashboard/src/app/api/leads/[id]/status/route.ts` | Added `lead_status_changed` trigger dispatch |
| `apps/dashboard/src/actions/content.ts` | Added `content_published` trigger dispatch (3 paths) |
| `apps/dashboard/src/app/api/ventures/route.ts` | Added `venture_published` trigger dispatch |
| `apps/dashboard/src/app/api/releases/route.ts` | Added `release_published` trigger dispatch |
| `apps/portal/src/app/api/proposals/[id]/accept/route.ts` | Added `proposal_accepted` trigger dispatch |

---

## What Was Not Changed

- **No new workflow features** — no engine changes, no new action types, no UI changes
- **No redesign** — the `TriggerRegistry`, `WorkflowEngine`, and `BackgroundWorker` are untouched
- **No duplicate dispatch** — each trigger type fires exactly once per successful operation
- **No existing behavior altered** — all original error handling, auth checks, and response logic remain intact
- **No test files removed** — existing test coverage (`test-e2e.ts`) is preserved
