# Phase 08 — CRM System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build CRM lead management with pipeline, notes, activities, assignments, UTM tracking, abandoned lead recovery, and reporting foundation.

**Architecture:** CRM business logic lives in `packages/crm/` (repository + service pattern), exposed via Next.js API route handlers in `apps/dashboard/src/app/api/leads/`, and rendered in dashboard pages under `apps/dashboard/src/app/dashboard/crm/`. DB schema and validation already exist.

**Tech Stack:** TypeScript, postgres driver, Next.js 16 App Router, Zod (already in @repo/validation), existing UI components from @repo/ui

**Implementation Order (sequential):**
1. Lead Engine (CRUD + search/filter/pagination) — packages/crm + API routes
2. Lead Detail View — API + pages
3. Notes System — API + pages
4. Activity Timeline — API + pages
5. Assignment System — API + pages
6. Pipeline System — API + pages (Kanban)
7. Abandoned Lead Recovery — API + pages
8. UTM Tracking — API integration
9. Reporting Foundation — API + dashboard widgets
10. Dashboard Pages — all CRM pages

---

## File Structure

### packages/crm/
- `src/index.ts` — re-exports all public API
- `src/config.ts` — DB config (reuse from @repo/database)
- `src/types.ts` — CRM-specific types (API response shapes, filter params)
- `src/errors.ts` — CRM-specific error classes
- `src/lead-repository.ts` — LeadRepository: raw SQL CRUD for leads table
- `src/activity-repository.ts` — ActivityRepository: raw SQL CRUD for lead_activities table
- `src/note-repository.ts` — NoteRepository: raw SQL CRUD for lead_notes table
- `src/abandoned-repository.ts` — AbandonedRepository: raw SQL CRUD for abandoned_leads table

### apps/dashboard/src/app/api/leads/
- `route.ts` — GET (list) + POST (create)
- `follow-up/route.ts` — GET (follow-up queue)
- `[id]/route.ts` — GET + PATCH + DELETE
- `[id]/status/route.ts` — POST (change pipeline stage)
- `[id]/assign/route.ts` — POST (assign/reassign)
- `[id]/activities/route.ts` — GET (timeline)
- `[id]/notes/route.ts` — POST (add note)
- `[id]/notes/[noteId]/route.ts` — PATCH (edit note)
- `[id]/recovery/route.ts` — GET + POST (recovery)

### apps/dashboard/src/app/dashboard/crm/
- `page.tsx` — CRM main page (tabs: Pipeline Board, Leads Table, Overview, Recovery)
- `components/crm-header.tsx` — Page header with create button + filters
- `components/lead-table.tsx` — DataTable view of leads
- `components/lead-kanban.tsx` — Kanban pipeline board
- `components/lead-card.tsx` — Kanban card
- `components/lead-create-dialog.tsx` — Create lead dialog
- `components/pipeline-stats.tsx` — Pipeline counts
- `components/source-breakdown.tsx` — Source breakdown
- `components/recovery-queue.tsx` — Abandoned lead recovery queue
- `leads/[id]/page.tsx` — Lead detail page
- `leads/[id]/components/lead-profile.tsx` — Profile card
- `leads/[id]/components/lead-notes.tsx` — Notes timeline
- `leads/[id]/components/lead-activities.tsx` — Activity timeline
- `leads/[id]/components/lead-utm.tsx` — UTM info panel
- `leads/[id]/components/lead-status-badge.tsx` — Status badge

---

### Task 1: Lead Repository

**Files:**
- Create: `packages/crm/src/errors.ts`
- Create: `packages/crm/src/types.ts`
- Create: `packages/crm/src/lead-repository.ts`

**Step 1: Create errors.ts**

```typescript
export class CrmError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "CrmError";
  }
}

export class LeadNotFoundError extends CrmError {
  constructor(id: string) {
    super(`Lead not found: ${id}`, "LEAD_NOT_FOUND");
  }
}
```

**Step 2: Create types.ts**

```typescript
import type { leadStatus } from "@repo/database";

export type LeadStatus = typeof leadStatus.enumValues[number];

export interface LeadFilters {
  status?: LeadStatus | LeadStatus[];
  source?: string;
  assignedTo?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface LeadListResponse {
  leads: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LeadRow {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  budget: string | null;
  timeline: string | null;
  projectType: string | null;
  inquiryType: string | null;
  message: string | null;
  leadSource: string | null;
  status: string;
  assignedUserId: string | null;
  followUpDate: string | null;
  followUpNotes: string | null;
  convertedToProjectId: string | null;
  convertedToEventId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  slaMinutes: number | null;
  firstResponseAt: string | null;
  responseStatus: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
```

**Step 3: Create lead-repository.ts**

```typescript
import postgres from "postgres";
import type { LeadFilters, LeadRow, LeadListResponse } from "./types";

export class LeadRepository {
  constructor(private sql: postgres.Sql) {}

  async list(filters: LeadFilters = {}): Promise<LeadListResponse> {
    const { status, source, assignedTo, search, dateFrom, dateTo, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      conditions.push(`status = ANY($${paramIndex++})`);
      params.push(statuses);
    }
    if (source) {
      conditions.push(`lead_source = $${paramIndex++}`);
      params.push(source);
    }
    if (assignedTo) {
      conditions.push(`assigned_user_id = $${paramIndex++}`);
      params.push(assignedTo);
    }
    if (search) {
      conditions.push(`(full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR company ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (dateFrom) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(dateTo);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe(`SELECT COUNT(*) as total FROM leads ${where}`, ...params);
    const total = Number(countResult[0]?.total ?? 0);

    const rows = await this.sql.unsafe<LeadRow[]>(
      `SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      ...params, pageSize, offset
    );

    return { leads: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<LeadRow | null> {
    const rows = await this.sql.unsafe<LeadRow[]>("SELECT * FROM leads WHERE id = $1", id);
    return rows[0] ?? null;
  }

  async create(data: Partial<LeadRow> & { email?: string }): Promise<LeadRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const columns = ["id", "created_at", "updated_at"];
    const values: any[] = [id, now, now];
    const placeholders = ["$1", "$2", "$3"];
    let idx = 4;

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || key === "id" || key === "createdAt" || key === "updatedAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      columns.push(dbCol);
      values.push(value);
      placeholders.push(`$${idx++}`);
    }

    const rows = await this.sql.unsafe<LeadRow[]>(
      `INSERT INTO leads (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
      ...values
    );
    return rows[0];
  }

  async update(id: string, data: Partial<LeadRow>): Promise<LeadRow | null> {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      sets.push(`${dbCol} = $${idx++}`);
      values.push(value);
    }

    if (sets.length === 0) return this.getById(id);
    sets.push(`updated_at = NOW()`);

    values.push(id);
    const rows = await this.sql.unsafe<LeadRow[]>(
      `UPDATE leads SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      ...values
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe("DELETE FROM leads WHERE id = $1 RETURNING id", id);
    return result.length > 0;
  }

  async changeStatus(id: string, newStatus: string, userId?: string): Promise<LeadRow | null> {
    const rows = await this.sql.unsafe<LeadRow[]>(
      `UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      newStatus, id
    );
    return rows[0] ?? null;
  }

  async assign(id: string, assignedUserId: string | null): Promise<LeadRow | null> {
    const rows = await this.sql.unsafe<LeadRow[]>(
      `UPDATE leads SET assigned_user_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      assignedUserId, id
    );
    return rows[0] ?? null;
  }

  async getFollowUpQueue(): Promise<LeadRow[]> {
    return this.sql.unsafe<LeadRow[]>(
      `SELECT * FROM leads WHERE follow_up_date <= CURRENT_DATE AND status NOT IN ('won', 'lost', 'archived') ORDER BY follow_up_date ASC`
    );
  }

  async getPipelineCounts(): Promise<{ status: string; count: number }[]> {
    return this.sql.unsafe<{ status: string; count: number }[]>(
      `SELECT status, COUNT(*)::int as count FROM leads GROUP BY status ORDER BY status`
    );
  }

  async getSourceBreakdown(): Promise<{ source: string; count: number }[]> {
    return this.sql.unsafe<{ source: string; count: number }[]>(
      `SELECT COALESCE(lead_source, 'unknown') as source, COUNT(*)::int as count FROM leads GROUP BY lead_source ORDER BY count DESC`
    );
  }
}
```

**Step 4: Verify package builds**

Run: `cd packages/crm && npx tsc --noEmit`
Expected: No errors

---

### Task 2: Activity + Note + Abandoned Repositories

**Files:**
- Create: `packages/crm/src/activity-repository.ts`
- Create: `packages/crm/src/note-repository.ts`
- Create: `packages/crm/src/abandoned-repository.ts`

**Step 1: Create activity-repository.ts**

```typescript
import postgres from "postgres";

export interface ActivityRow {
  id: string;
  leadId: string;
  activityType: string;
  description: string;
  metadata: Record<string, any> | null;
  createdBy: string | null;
  createdAt: string;
}

export class ActivityRepository {
  constructor(private sql: postgres.Sql) {}

  async log(leadId: string, activityType: string, description: string, createdBy?: string | null, metadata?: Record<string, any>): Promise<ActivityRow> {
    const id = crypto.randomUUID();
    const rows = await this.sql.unsafe<ActivityRow[]>(
      `INSERT INTO lead_activities (id, lead_id, activity_type, description, metadata, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      id, leadId, activityType, description, metadata ? JSON.stringify(metadata) : null, createdBy ?? null
    );
    return rows[0];
  }

  async getByLeadId(leadId: string): Promise<ActivityRow[]> {
    return this.sql.unsafe<ActivityRow[]>(
      "SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY created_at ASC",
      leadId
    );
  }

  async getRecentByLeadId(leadId: string, limit = 50): Promise<ActivityRow[]> {
    return this.sql.unsafe<ActivityRow[]>(
      "SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY created_at DESC LIMIT $2",
      leadId, limit
    );
  }
}
```

**Step 2: Create note-repository.ts**

```typescript
import postgres from "postgres";

export interface NoteRow {
  id: string;
  leadId: string;
  note: string;
  isInternal: boolean;
  createdBy: string | null;
  createdAt: string;
}

export class NoteRepository {
  constructor(private sql: postgres.Sql) {}

  async create(leadId: string, note: string, createdBy?: string | null, isInternal = true): Promise<NoteRow> {
    const id = crypto.randomUUID();
    const rows = await this.sql.unsafe<NoteRow[]>(
      `INSERT INTO lead_notes (id, lead_id, note, is_internal, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      id, leadId, note, isInternal, createdBy ?? null
    );
    return rows[0];
  }

  async update(id: string, note: string): Promise<NoteRow | null> {
    const rows = await this.sql.unsafe<NoteRow[]>(
      "UPDATE lead_notes SET note = $1 WHERE id = $2 RETURNING *",
      note, id
    );
    return rows[0] ?? null;
  }

  async getByLeadId(leadId: string): Promise<NoteRow[]> {
    return this.sql.unsafe<NoteRow[]>(
      "SELECT * FROM lead_notes WHERE lead_id = $1 ORDER BY created_at DESC",
      leadId
    );
  }

  async getById(id: string): Promise<NoteRow | null> {
    const rows = await this.sql.unsafe<NoteRow[]>("SELECT * FROM lead_notes WHERE id = $1", id);
    return rows[0] ?? null;
  }
}
```

**Step 3: Create abandoned-repository.ts**

```typescript
import postgres from "postgres";

export interface AbandonedLeadRow {
  id: string;
  email: string | null;
  phone: string | null;
  sourcePage: string | null;
  metadata: Record<string, any> | null;
  capturedAt: string;
}

export class AbandonedRepository {
  constructor(private sql: postgres.Sql) {}

  async capture(data: { email?: string; phone?: string; sourcePage?: string; metadata?: Record<string, any> }): Promise<AbandonedLeadRow> {
    const id = crypto.randomUUID();
    const rows = await this.sql.unsafe<AbandonedLeadRow[]>(
      `INSERT INTO abandoned_leads (id, email, phone, source_page, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      id, data.email ?? null, data.phone ?? null, data.sourcePage ?? null, data.metadata ? JSON.stringify(data.metadata) : null
    );
    return rows[0];
  }

  async list(): Promise<AbandonedLeadRow[]> {
    return this.sql.unsafe<AbandonedLeadRow[]>(
      "SELECT * FROM abandoned_leads ORDER BY captured_at DESC"
    );
  }

  async getById(id: string): Promise<AbandonedLeadRow | null> {
    const rows = await this.sql.unsafe<AbandonedLeadRow[]>("SELECT * FROM abandoned_leads WHERE id = $1", id);
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe("DELETE FROM abandoned_leads WHERE id = $1 RETURNING id", id);
    return result.length > 0;
  }
}
```

**Step 4: Verify package builds**

Run: `cd packages/crm && npx tsc --noEmit`
Expected: No errors

---

### Task 3: CRM Package Index

**Files:**
- Modify: `packages/crm/src/index.ts`

Replace the placeholder with:

```typescript
import postgres from "postgres";
import { LeadRepository } from "./lead-repository";
import { ActivityRepository } from "./activity-repository";
import { NoteRepository } from "./note-repository";
import { AbandonedRepository } from "./abandoned-repository";

export { LeadRepository } from "./lead-repository";
export { ActivityRepository } from "./activity-repository";
export { NoteRepository } from "./note-repository";
export { AbandonedRepository } from "./abandoned-repository";
export { LeadNotFoundError, CrmError } from "./errors";
export type { LeadFilters, LeadRow, LeadListResponse, LeadStatus } from "./types";
export type { ActivityRow } from "./activity-repository";
export type { NoteRow } from "./note-repository";
export type { AbandonedLeadRow } from "./abandoned-repository";

export function createCrmRepositories(connectionString: string) {
  const sql = postgres(connectionString, { max: 10 });
  return {
    leads: new LeadRepository(sql),
    activities: new ActivityRepository(sql),
    notes: new NoteRepository(sql),
    abandoned: new AbandonedRepository(sql),
    sql,
  };
}
```

**Step 1: Verify builds**

Run: `cd packages/crm && npx tsc --noEmit`
Expected: No errors

---

### Task 4: Lead List + Create API Routes

**Files:**
- Create: `apps/dashboard/src/app/api/leads/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createCrmRepositories, LeadNotFoundError } from "@repo/crm";
import { requirePermission } from "@repo/auth/server";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "crm.view_leads");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const assignedTo = searchParams.get("assignedTo");
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

  const { leads } = createCrmRepositories(dbUrl);
  try {
    const result = await leads.list({ status: status ?? undefined, source: source ?? undefined, assignedTo: assignedTo ?? undefined, search: search ?? undefined, dateFrom: dateFrom ?? undefined, dateTo: dateTo ?? undefined, page, pageSize });
    return NextResponse.json(result);
  } finally {
    // Note: in production, use connection pooling
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "crm.create_lead");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const userId = req.headers.get("x-user-id") ?? undefined;

  const { leads, activities } = createCrmRepositories(dbUrl);
  try {
    const lead = await leads.create({ ...body, createdBy: userId });
    await activities.log(lead.id, "lead_created", "Lead created via form/manual entry", userId, { source: body.leadSource });
    return NextResponse.json(lead, { status: 201 });
  } finally {
    // cleanup
  }
}
```

**Step 1: Verify route loads**

Run dev server and test: `curl http://localhost:3000/api/leads`
Expected: 200 with empty list

---

### Task 5: Lead Detail + Update + Delete API Routes

**Files:**
- Create: `apps/dashboard/src/app/api/leads/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createCrmRepositories, LeadNotFoundError } from "@repo/crm";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { leads, activities, notes } = createCrmRepositories(dbUrl);
  try {
    const lead = await leads.getById(id);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    const [activityList, noteList] = await Promise.all([
      activities.getRecentByLeadId(id),
      notes.getByLeadId(id),
    ]);
    return NextResponse.json({ ...lead, activities: activityList, notes: noteList });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(req, "crm.edit_lead");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { leads, activities } = createCrmRepositories(dbUrl);
  try {
    const lead = await leads.update(id, body);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    await activities.log(id, "lead_updated", "Lead information updated", req.headers.get("x-user-id") ?? undefined, { updatedFields: Object.keys(body) });
    return NextResponse.json(lead);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(req, "crm.delete_lead");
  if (auth instanceof NextResponse) return auth;

  const { leads } = createCrmRepositories(dbUrl);
  try {
    const deleted = await leads.delete(id);
    if (!deleted) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  }
}
```

---

### Task 6: Status Change + Assign + Activities + Notes API Routes

**Files:**
- Create: `apps/dashboard/src/app/api/leads/[id]/status/route.ts`
- Create: `apps/dashboard/src/app/api/leads/[id]/assign/route.ts`
- Create: `apps/dashboard/src/app/api/leads/[id]/activities/route.ts`
- Create: `apps/dashboard/src/app/api/leads/[id]/notes/route.ts`

(Full implementation details in the actual code - follows pattern of Task 4/5)

---

### Task 7: Follow-up Queue + Abandoned Routes

**Files:**
- Create: `apps/dashboard/src/app/api/leads/follow-up/route.ts`
- Create: `apps/dashboard/src/app/api/abandoned/route.ts`

---

### Task 8: Dashboard CRM Main Page

**Files:**
- Create: `apps/dashboard/src/app/dashboard/crm/page.tsx`
- Create: all component files listed in File Structure

The main page uses Tabs: Pipeline Board (Kanban), Leads Table, Overview (counts), Recovery Queue. Each tab fetches from the corresponding API and renders with existing UI components.

---

### Task 9: Lead Detail Page

**Files:**
- Create: `apps/dashboard/src/app/dashboard/crm/leads/[id]/page.tsx`
- Create: all sub-component files

Shows full lead profile with Notes panel, Activity Timeline, UTM info, Assignment controls, Status change.

---

### Task 10: Verification

Test all endpoints with curl, verify UI renders, check pipeline drag-and-drop works.
