# Phase 16 — Automation & Workflow System

## Overview

Connect CRM, CMS, Analytics, Portal, Ventures, Releases, and SEO through event-driven workflows. Phase 16 provides a reusable workflow engine, trigger-to-action binding, async execution with retry, full audit trail, and a dashboard management UI.

## Architecture

```
[External Trigger] → TriggerRegistry.dispatch()
                           ↓
              Find active workflows matching trigger_type
                           ↓
              WorkflowEngine.createRun() → workflow_runs (pending)
                           ↓
              Worker.poll() ← polls workflow_runs WHERE status = pending
                           ↓
              WorkflowEngine.execute(run)
                           ↓
              Actions execute sequentially, each writes workflow_logs
                           ↓
              On failure: retry_count++, next_retry_at (backoff)
              On all complete: run status = completed
              On max retries exceeded: run status = failed
```

## Schema

### `workflows`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | defaultRandom |
| name | text NOT NULL | |
| trigger_type | varchar(100) NOT NULL | Which trigger activates this workflow |
| trigger_config | jsonb | Filter conditions (can be `{}`) |
| actions | jsonb NOT NULL | `[{type, config, order}]` |
| version | integer NOT NULL DEFAULT 1 | Incremented on update |
| is_active | boolean NOT NULL DEFAULT true | Toggle without deleting |
| max_retries | integer NOT NULL DEFAULT 3 | Per-action retry limit |
| created_by | uuid | FK to users |
| created_at | timestamp with tz | defaultNow |
| updated_at | timestamp with tz | defaultNow |

### `workflow_runs`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | defaultRandom |
| workflow_id | uuid NOT NULL FK → workflows | |
| workflow_version | integer NOT NULL | Snapshot of workflow version at run time |
| trigger_type | varchar(100) NOT NULL | Denormalized for querying |
| trigger_entity_id | uuid | The record that triggered (e.g. lead_id) |
| trigger_payload | jsonb | Snapshot of the trigger payload |
| status | varchar(20) NOT NULL DEFAULT 'pending' | pending/running/completed/failed/partially_failed |
| started_at | timestamp with tz | Set when execution begins |
| completed_at | timestamp with tz | Set when terminal state reached |
| retry_count | integer NOT NULL DEFAULT 0 | Total retries across all actions |
| next_retry_at | timestamp with tz | For scheduling retry polling |
| created_at | timestamp with tz | defaultNow |

### `workflow_logs`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | defaultRandom |
| run_id | uuid NOT NULL FK → workflow_runs | |
| action_type | varchar(100) NOT NULL | Which action handler |
| action_order | integer NOT NULL | Position in action sequence |
| status | varchar(20) NOT NULL DEFAULT 'pending' | pending/running/completed/failed |
| input | jsonb | Action input snapshot |
| output | jsonb | Action result data |
| error | text | Error message if failed |
| started_at | timestamp with tz | |
| completed_at | timestamp with tz | |
| created_at | timestamp with tz | defaultNow |

## Trigger Registry

All triggers are defined in `trigger-registry.ts`. Each dispatch:
1. Finds all active workflows matching trigger_type
2. For each match, creates a workflow_run (status = pending)
3. Returns immediately (async execution)

### Trigger List

| Trigger | Payload | Dispatched By |
|---|---|---|
| `lead_created` | `{ lead_id, email, name, source }` | CRM lead creation |
| `lead_status_changed` | `{ lead_id, old_status, new_status }` | CRM lead status update |
| `form_submitted` | `{ form_id, submission_id, form_data }` | Form submission handler |
| `content_published` | `{ entity_type, entity_id, slug }` | Content publish hook |
| `venture_published` | `{ venture_id, slug }` | Venture publish hook |
| `release_published` | `{ release_id, slug }` | Release publish hook |
| `proposal_accepted` | `{ proposal_id, client_name, client_email }` | Proposal accept handler |
| `invoice_paid` | `{ invoice_id, amount, currency }` | Invoice payment handler |
| `portal_message_received` | `{ message_id, sender_id, thread_id }` | Portal message handler |

## Action Registry

Each action is a function: `(actionConfig, triggerPayload) => Promise<ActionResult>`. Actions execute sequentially per run. On failure, retry resumes from the failed action.

### Action List

| Action | Config Fields | Behavior |
|---|---|---|
| `create_task` | title, description, assignee_id, due_in_days | Creates a task record |
| `create_timeline_event` | entity_type, entity_id, event_type, description | Adds to timeline |
| `create_crm_activity` | lead_id, activity_type, description | Logs CRM activity |
| `send_notification` | user_id, title, body, type (info/warning/success) | Creates notification |
| `assign_user` | entity_type, entity_id, user_id | Assigns user to entity |
| `update_status` | entity_type, entity_id, new_status | Updates entity status |
| `create_follow_up` | days_from_now, note, assignee_id | Creates follow-up reminder |
| `trigger_webhook` | url, method (GET/POST), headers (object), body_template (string) | HTTP call |

## Background Worker

- Simple polling loop: `GET /api/workflows/process` (also callable via cron or button)
- Polls: `workflow_runs WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= NOW())`
- Orders by `created_at ASC` (FIFO)
- Processes one run per call (one-at-a-time for simplicity)
- Retry backoff: `next_retry_at = NOW() + (retry_count ^ 2) minutes` (1, 4, 9, 16...)
- On max retries: marks run as `failed`

## API Endpoints

All under `/api/workflows/` in the dashboard app. Follow existing patterns (auth check, repository layer, JSON response).

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/workflows` | GET | List workflows (paginated, filterable by trigger_type, is_active) |
| `/api/workflows` | POST | Create workflow |
| `/api/workflows/[id]` | GET | Get workflow detail |
| `/api/workflows/[id]` | PATCH | Update workflow (increments version) |
| `/api/workflows/[id]` | DELETE | Delete workflow |
| `/api/workflows/runs` | GET | List workflow runs (paginated, filterable by status, workflow_id) |
| `/api/workflows/runs/[id]` | GET | Run detail + associated workflow_logs |
| `/api/workflows/runs/[id]/retry` | POST | Manually retry a failed run |
| `/api/workflows/process` | POST | Execute one cycle of the background worker |
| `/api/workflows/trigger-test` | POST | Manually dispatch a trigger for testing |

## Dashboard Pages

All under `/dashboard/workflows/`. Follow existing patterns (use client, fetch, Card, tabs, pagination).

| Route | Purpose |
|---|---|
| `/dashboard/workflows` | List workflows with search and status filter |
| `/dashboard/workflows/new` | Create workflow (name, trigger_type, trigger_config, actions, max_retries) |
| `/dashboard/workflows/[id]` | View/edit workflow detail + version display |
| `/dashboard/workflows/[id]/runs` | Run history for this specific workflow |
| `/dashboard/workflows/runs` | Global run history across all workflows |
| `/dashboard/workflows/runs/[id]` | Single run detail with action-level logs timeline |

## Navigation

Add to `apps/dashboard/src/lib/navigation.ts` under "Operations" section:
- title: "Workflows", href: "/dashboard/workflows", icon: Workflow (from lucide-react) or GitBranch

## Files to Create/Modify

### Create
- `packages/database/src/schema/workflows/workflows.ts`
- `packages/database/src/schema/workflows/workflow-runs.ts`
- `packages/database/src/schema/workflows/workflow-logs.ts`
- `packages/database/src/schema/workflows/index.ts`
- `packages/workflows/package.json`
- `packages/workflows/tsconfig.json`
- `packages/workflows/src/index.ts`
- `packages/workflows/src/types.ts`
- `packages/workflows/src/repository.ts`
- `packages/workflows/src/engine.ts`
- `packages/workflows/src/trigger-registry.ts`
- `packages/workflows/src/actions/index.ts`
- `packages/workflows/src/actions/create-task.ts`
- `packages/workflows/src/actions/create-timeline-event.ts`
- `packages/workflows/src/actions/create-crm-activity.ts`
- `packages/workflows/src/actions/send-notification.ts`
- `packages/workflows/src/actions/assign-user.ts`
- `packages/workflows/src/actions/update-status.ts`
- `packages/workflows/src/actions/create-follow-up.ts`
- `packages/workflows/src/actions/trigger-webhook.ts`
- `packages/workflows/src/worker.ts`
- `apps/dashboard/src/app/api/workflows/route.ts`
- `apps/dashboard/src/app/api/workflows/[id]/route.ts`
- `apps/dashboard/src/app/api/workflows/runs/route.ts`
- `apps/dashboard/src/app/api/workflows/runs/[id]/route.ts`
- `apps/dashboard/src/app/api/workflows/runs/[id]/retry/route.ts`
- `apps/dashboard/src/app/api/workflows/process/route.ts`
- `apps/dashboard/src/app/api/workflows/trigger-test/route.ts`
- `apps/dashboard/src/app/dashboard/workflows/page.tsx`
- `apps/dashboard/src/app/dashboard/workflows/new/page.tsx`
- `apps/dashboard/src/app/dashboard/workflows/[id]/page.tsx`
- `apps/dashboard/src/app/dashboard/workflows/[id]/runs/page.tsx`
- `apps/dashboard/src/app/dashboard/workflows/runs/page.tsx`
- `apps/dashboard/src/app/dashboard/workflows/runs/[id]/page.tsx`

### Modify
- `packages/database/src/schema/enums.ts` — add workflow-related enums
- `packages/database/src/schema/index.ts` — add workflows schema exports
- `packages/database/src/index.ts` — export WorkflowRepository, WorkflowEngine if needed
- `apps/dashboard/src/lib/navigation.ts` — add Workflows nav item

## Constraints

- No UI beautification. Use existing dashboard patterns verbatim.
- No external queue infrastructure. DB-backed async only.
- Keep design queue-ready for future broker swap.
- All actions log immediately. No erasing completed work on retry.
- Workflow definitions are versioned. Historical runs preserve their version.

## Verification

After implementation, verify:
1. All API routes return correct HTTP codes
2. Trigger dispatch creates pending workflow_runs
3. Worker processes pending runs (actions execute, logs created)
4. Action failure → retry with backoff
5. Max retries → run status = failed
6. Retry resumes from failed action (not action #1)
7. Run detail shows full action audit trail
