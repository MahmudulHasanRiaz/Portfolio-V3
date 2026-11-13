// Admin freelance projects CRUD — Hono port of the Next.js admin REST routes
// apps/admin/src/app/api/freelance/projects/route.ts,
// apps/admin/src/app/api/freelance/projects/[id]/route.ts,
// apps/admin/src/app/api/freelance/projects/[id]/milestones/route.ts,
// apps/admin/src/app/api/freelance/projects/[id]/milestones/[mid]/route.ts,
// apps/admin/src/app/api/freelance/projects/[id]/deliverables/route.ts,
// apps/admin/src/app/api/freelance/projects/[id]/deliverables/[did]/route.ts,
// apps/admin/src/app/api/freelance/projects/[id]/activities/route.ts, and
// apps/admin/src/app/api/freelance/projects/[id]/portal/route.ts.
// Mounted at /api/admin/freelance by routes/admin/index.ts, so the full
// paths are /api/admin/freelance/projects...
//
// Fidelity notes:
// - Auth: every V2 source checks a Better Auth session and 401s without one
//   (none of these 8 routes is public by design), so every route here calls
//   requireAuth. There is no role check in any source — any authenticated
//   admin user may call them, exactly as in V2.
// - The sources ran raw postgres.js (`postgres(dbUrl, {max:1})` +
//   `sql.unsafe`) with values as $n parameters. Every query here is Drizzle
//   over the Neon HTTP driver (db.ts); user input only ever reaches the DB
//   as a bound parameter, never interpolated into SQL text. Dynamic
//   create/update bodies are handled the same way the other admin routers
//   do it (releases.ts / finance.ts): a `getTableColumns` allowlist, so
//   only real columns are written and unknown keys are dropped. (In V2 an
//   unknown key produced a SQL error; the admin UI only ever sends known
//   fields, so dropping them is the safe equivalent.)
// - Response shapes match the sources: list returns
//   { projects, total, page, pageSize, totalPages } with the same mapped
//   subset of fields; get/update return the row; delete returns
//   { success: true }; 404s are "Not found"; 400/500 messages are copied
//   verbatim. One deliberate normalisation, as in releases.ts: the sources
//   returned raw postgres.js rows (snake_case keys) from create/update,
//   while their GETs mapped to camelCase. Drizzle rows are already
//   camelCase, so create/update return camelCase rows here — the shape the
//   admin UI reads (dueDate, sortOrder, ...).
// - Methods match the sources exactly: the project, milestone and
//   deliverable detail routes use PUT (not PATCH); activities is GET-only;
//   portal is POST-only (toggle).
// - Multi-statement operations (project delete, portal toggle) run as
//   sequential statements, NOT db.transaction(): the Neon HTTP driver
//   does not support transactions. The sources had the same ordering
//   (log first, children next, project last on delete).
// - logProjectActivity is best-effort, as in V2 (lib/project-activity.ts):
//   a failed activity insert is swallowed and never breaks the main op.
// - Portal toggle: the source used `createPortalRepositories` from
//   @repo/portal-pkg (postgres.js TCP, cannot run on Workers, and not a
//   dependency of apps/api). Its three session operations used here
//   (getSessionByProjectId / createSession / bindClientEmail) are plain
//   single-row queries on portal_sessions, reimplemented below with
//   Drizzle — same SQL semantics, including bindClientEmail's
//   `client_email IS NULL` guard. Disabling portal access does NOT delete
//   the portal_sessions row, exactly as in V2.
// - Deliverables list ordering: the V2 source ordered by
//   `created_at DESC NULLS LAST`, but the project_deliverables table has
//   NO created_at column (migration 0000_loud_argent.sql + the Drizzle
//   schema agree) — the V2 query errors at runtime (42703). The port
//   therefore returns the rows unordered rather than inventing a sort
//   key or keeping a query that can never succeed.
import { Hono } from "hono";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  isNull,
  or,
} from "drizzle-orm";
import {
  deliverableStatus,
  freelanceProjectStatus,
  leads,
  milestoneStatus,
  portalSessions,
  projectActivityLogs,
  projectDeliverables,
  projectMilestones,
  projectsFreelance,
} from "@repo/database/schema";
import { getApiDb, type ApiDb } from "../../db";
import { requireAuth, unauthorized } from "../../lib/admin-auth";

const app = new Hono();

const PROJECT_STATUSES = new Set([
  "draft",
  "in_progress",
  "under_review",
  "revision_requested",
  "completed",
  "archived",
]);

const MILESTONE_STATUSES = new Set([
  "pending",
  "in_progress",
  "completed",
  "approved",
]);

const DELIVERABLE_STATUSES = new Set([
  "pending",
  "submitted",
  "approved",
  "revision_requested",
]);

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** V2 list pagination: page >= 1 else 1; pageSize 1..100 else 20. */
function parsePage(query: (name: string) => string | undefined): {
  page: number;
  pageSize: number;
} {
  const parsedPage = parseInt(query("page") ?? "1", 10);
  const parsedPageSize = parseInt(query("pageSize") ?? "20", 10);
  return {
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize:
      Number.isFinite(parsedPageSize) &&
      parsedPageSize > 0 &&
      parsedPageSize <= 100
        ? parsedPageSize
        : 20,
  };
}

/**
 * Map a dashboard-form body to table insert/update values, allowlisted
 * against the table's real columns. `id` / `createdAt` / `updatedAt` /
 * `createdBy` are never taken from the body.
 * - Create: undefined, null and "" are skipped, so the column default /
 *   NULL applies (V2: "blank dates/amounts arrive as '' from the form and
 *   must not reach date/numeric columns").
 * - Update: "" becomes NULL (V2: "a blank form field clears the value"),
 *   undefined is skipped.
 */
function bodyFields(
  table: Parameters<typeof getTableColumns>[0],
  body: Record<string, unknown>,
  mode: "create" | "update",
): Record<string, unknown> {
  const columns = getTableColumns(table);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (
      key === "id" ||
      key === "createdAt" ||
      key === "updatedAt" ||
      key === "createdBy"
    ) {
      continue;
    }
    if (!(key in columns)) continue;
    if (value === undefined) continue;
    if (mode === "create" && (value === null || value === "")) continue;
    out[key] = value === "" ? null : value;
  }
  return out;
}

/**
 * Map a body to milestone/deliverable update values. Like bodyFields in
 * update mode, plus `projectId` is never updatable (V2 skipped id /
 * project_id / created_at; these tables have no updated_at column).
 */
function childUpdateFields(
  table: Parameters<typeof getTableColumns>[0],
  body: Record<string, unknown>,
): Record<string, unknown> {
  const columns = getTableColumns(table);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "id" || key === "projectId" || key === "createdAt") continue;
    if (!(key in columns)) continue;
    if (value === undefined) continue;
    out[key] = value === "" ? null : value;
  }
  return out;
}

/**
 * Best-effort activity log (V2 lib/project-activity.ts). Logging must
 * never break the main operation, so every failure is swallowed here.
 */
async function logProjectActivity(
  db: ApiDb,
  input: {
    projectId: string;
    actorId?: string | null;
    action: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await db.insert(projectActivityLogs).values({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      actorId: input.actorId ?? null,
      action: input.action,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Activity logging is informational only.
  }
}

// ─── Freelance projects ──────────────────────────────────────────────────────

app.get("/projects", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const search = c.req.query("search") ?? undefined;
    const status = c.req.query("status") ?? undefined;
    const { page, pageSize } = parsePage((name) => c.req.query(name));
    const offset = (page - 1) * pageSize;

    const db = getApiDb();
    const where = and(
      search
        ? or(
            ilike(projectsFreelance.title, `%${search}%`),
            ilike(projectsFreelance.description, `%${search}%`),
          )
        : undefined,
      status
        ? eq(
            projectsFreelance.status,
            status as (typeof freelanceProjectStatus.enumValues)[number],
          )
        : undefined,
    );

    const [countRow] = await db
      .select({ total: count() })
      .from(projectsFreelance)
      .where(where);
    const total = countRow?.total ?? 0;
    const rows = await db
      .select()
      .from(projectsFreelance)
      .where(where)
      .orderBy(desc(projectsFreelance.createdAt))
      .limit(pageSize)
      .offset(offset);

    return c.json({
      projects: rows.map((r) => ({
        id: r.id,
        title: r.title,
        clientId: r.clientId,
        status: r.status,
        totalAgreedAmount: r.totalAgreedAmount,
        currency: r.currency,
        portalAccessEnabled: r.portalAccessEnabled,
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch projects") },
      500,
    );
  }
});

app.post("/projects", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const body = (await c.req.json()) as Record<string, unknown>;

    // Title is required; blank dates/amounts arrive as "" from the form and
    // must not reach date/numeric columns (Postgres rejects "" with a 500).
    // Skipped keys fall back to the column default / NULL.
    if (typeof body.title !== "string" || body.title.trim() === "") {
      return c.json({ error: "Project title is required" }, 400);
    }
    if (
      body.status !== undefined &&
      body.status !== null &&
      body.status !== "" &&
      !PROJECT_STATUSES.has(body.status as string)
    ) {
      return c.json({ error: "Invalid status" }, 400);
    }

    const db = getApiDb();
    const id = crypto.randomUUID();
    const now = new Date();
    const [row] = await db
      .insert(projectsFreelance)
      .values({
        ...bodyFields(projectsFreelance, body, "create"),
        id,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      } as typeof projectsFreelance.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create project" }, 500);

    await logProjectActivity(db, {
      projectId: id,
      actorId: user.id,
      action: "project_created",
      metadata: { title: body.title },
    });

    return c.json(row, 201);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to create project") },
      500,
    );
  }
});

app.get("/projects/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    const db = getApiDb();
    const [r] = await db
      .select()
      .from(projectsFreelance)
      .where(eq(projectsFreelance.id, id))
      .limit(1);
    if (!r) return c.json({ error: "Not found" }, 404);
    return c.json({
      id: r.id,
      title: r.title,
      clientId: r.clientId,
      status: r.status,
      description: r.description,
      scopeNotes: r.scopeNotes,
      startDate: r.startDate,
      expectedEndDate: r.expectedEndDate,
      actualEndDate: r.actualEndDate,
      totalAgreedAmount: r.totalAgreedAmount,
      currency: r.currency,
      isPaidProject: r.isPaidProject,
      portalAccessEnabled: r.portalAccessEnabled,
      portalToken: r.portalToken,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch project") },
      500,
    );
  }
});

app.put("/projects/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;

    if (
      body.status !== undefined &&
      body.status !== null &&
      body.status !== "" &&
      !PROJECT_STATUSES.has(body.status as string)
    ) {
      return c.json({ error: "Invalid status" }, 400);
    }
    if (
      body.title !== undefined &&
      (typeof body.title !== "string" || body.title.trim() === "")
    ) {
      return c.json({ error: "Project title cannot be empty" }, 400);
    }

    const db = getApiDb();
    const values = bodyFields(projectsFreelance, body, "update");
    if (Object.keys(values).length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    const [row] = await db
      .update(projectsFreelance)
      .set({
        ...values,
        updatedAt: new Date(),
      } as typeof projectsFreelance.$inferInsert)
      .where(eq(projectsFreelance.id, id))
      .returning();
    if (!row) return c.json({ error: "Not found" }, 404);

    await logProjectActivity(db, {
      projectId: id,
      actorId: user.id,
      action:
        typeof body.status === "string" && body.status !== ""
          ? "status_changed"
          : "project_updated",
      metadata:
        typeof body.status === "string" && body.status !== ""
          ? { status: body.status }
          : { fields: Object.keys(body) },
    });

    return c.json(row);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to update project") },
      500,
    );
  }
});

app.delete("/projects/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const id = c.req.param("id");
    const db = getApiDb();

    const [existing] = await db
      .select({ id: projectsFreelance.id })
      .from(projectsFreelance)
      .where(eq(projectsFreelance.id, id))
      .limit(1);
    if (!existing) return c.json({ error: "Not found" }, 404);

    await logProjectActivity(db, {
      projectId: id,
      actorId: user.id,
      action: "project_deleted",
      metadata: {},
    });

    // No FK cascade exists on milestones/deliverables/activity logs, so
    // remove them explicitly — otherwise deleting a project orphans rows.
    // Sequential statements, not a transaction: the Neon HTTP driver
    // does not support db.transaction().
    await db
      .delete(projectDeliverables)
      .where(eq(projectDeliverables.projectId, id));
    await db
      .delete(projectMilestones)
      .where(eq(projectMilestones.projectId, id));
    await db
      .delete(projectActivityLogs)
      .where(eq(projectActivityLogs.projectId, id));

    const [deleted] = await db
      .delete(projectsFreelance)
      .where(eq(projectsFreelance.id, id))
      .returning({ id: projectsFreelance.id });
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to delete project") },
      500,
    );
  }
});

// ─── Milestones ──────────────────────────────────────────────────────────────

app.get("/projects/:id/milestones", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const projectId = c.req.param("id");
    const db = getApiDb();
    const rows = await db
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId))
      // ORDER BY sort_order ASC NULLS LAST, created_at ASC — ASC is
      // already NULLS LAST in Postgres, so plain asc() matches.
      .orderBy(asc(projectMilestones.sortOrder), asc(projectMilestones.createdAt));
    // The detail page reads camelCase fields (dueDate, sortOrder).
    return c.json(
      rows.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        title: r.title,
        description: r.description,
        dueDate: r.dueDate,
        status: r.status,
        sortOrder: r.sortOrder,
        createdAt: r.createdAt,
      })),
    );
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch milestones") },
      500,
    );
  }
});

app.post("/projects/:id/milestones", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const projectId = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;

    if (typeof body.title !== "string" || body.title.trim() === "") {
      return c.json({ error: "Milestone title is required" }, 400);
    }

    const db = getApiDb();
    const id = crypto.randomUUID();
    const [row] = await db
      .insert(projectMilestones)
      .values({
        id,
        projectId,
        title: body.title,
        description: (body.description as string | undefined) || null,
        dueDate: (body.dueDate as string | undefined) || null,
        status: "pending" as (typeof milestoneStatus.enumValues)[number],
        sortOrder: (body.sortOrder as number | undefined) || 0,
        createdAt: new Date(),
      })
      .returning();
    if (!row) return c.json({ error: "Failed to create milestone" }, 500);

    await logProjectActivity(db, {
      projectId,
      actorId: user.id,
      action: "milestone_created",
      metadata: { milestoneId: id, title: body.title },
    });

    return c.json(row, 201);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to create milestone") },
      500,
    );
  }
});

app.put("/projects/:id/milestones/:mid", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const projectId = c.req.param("id");
    const mid = c.req.param("mid");
    const body = (await c.req.json()) as Record<string, unknown>;

    if (
      body.status !== undefined &&
      body.status !== null &&
      body.status !== "" &&
      !MILESTONE_STATUSES.has(body.status as string)
    ) {
      return c.json({ error: "Invalid milestone status" }, 400);
    }

    const db = getApiDb();
    const values = childUpdateFields(projectMilestones, body);
    if (Object.keys(values).length === 0) {
      return c.json({ error: "No fields" }, 400);
    }
    const [row] = await db
      .update(projectMilestones)
      .set(values as typeof projectMilestones.$inferInsert)
      .where(
        and(
          eq(projectMilestones.id, mid),
          eq(projectMilestones.projectId, projectId),
        ),
      )
      .returning();
    if (!row) return c.json({ error: "Not found" }, 404);

    await logProjectActivity(db, {
      projectId,
      actorId: user.id,
      action: "milestone_updated",
      metadata: { milestoneId: mid, fields: Object.keys(body) },
    });

    return c.json(row);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to update milestone") },
      500,
    );
  }
});

app.delete("/projects/:id/milestones/:mid", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const projectId = c.req.param("id");
    const mid = c.req.param("mid");
    const db = getApiDb();
    const [deleted] = await db
      .delete(projectMilestones)
      .where(
        and(
          eq(projectMilestones.id, mid),
          eq(projectMilestones.projectId, projectId),
        ),
      )
      .returning({ id: projectMilestones.id });
    if (!deleted) return c.json({ error: "Not found" }, 404);

    await logProjectActivity(db, {
      projectId,
      actorId: user.id,
      action: "milestone_deleted",
      metadata: { milestoneId: mid },
    });

    return c.json({ success: true });
  } catch {
    return c.json({ error: "Failed to delete milestone" }, 500);
  }
});

// ─── Deliverables ────────────────────────────────────────────────────────────

app.get("/projects/:id/deliverables", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const projectId = c.req.param("id");
    const db = getApiDb();
    // No ORDER BY: the V2 source ordered by created_at, but the
    // project_deliverables table has no created_at column (see the header
    // note) — the V2 query errors at runtime. No sort is invented here.
    const rows = await db
      .select()
      .from(projectDeliverables)
      .where(eq(projectDeliverables.projectId, projectId));
    // The detail page reads camelCase fields (milestoneId, fileUrl,
    // submittedAt).
    return c.json({
      deliverables: rows.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        milestoneId: r.milestoneId,
        title: r.title,
        fileUrl: r.fileUrl,
        notes: r.notes,
        status: r.status,
        clientFeedback: r.clientFeedback,
        submittedAt: r.submittedAt,
        approvedAt: r.approvedAt,
      })),
    });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch deliverables") },
      500,
    );
  }
});

app.post("/projects/:id/deliverables", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const projectId = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;

    if (typeof body.title !== "string" || body.title.trim() === "") {
      return c.json({ error: "Deliverable title is required" }, 400);
    }

    const db = getApiDb();
    const id = crypto.randomUUID();
    const [row] = await db
      .insert(projectDeliverables)
      .values({
        id,
        projectId,
        milestoneId: body.milestoneId ? (body.milestoneId as string) : null,
        title: body.title,
        fileUrl:
          typeof body.fileUrl === "string" && body.fileUrl.trim() !== ""
            ? body.fileUrl.trim()
            : null,
        notes:
          typeof body.notes === "string" && body.notes.trim() !== ""
            ? body.notes.trim()
            : null,
        status: "pending" as (typeof deliverableStatus.enumValues)[number],
      })
      .returning();
    if (!row) return c.json({ error: "Failed to create deliverable" }, 500);

    await logProjectActivity(db, {
      projectId,
      actorId: user.id,
      action: "deliverable_created",
      metadata: { deliverableId: id, title: body.title },
    });

    return c.json(row, 201);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to create deliverable") },
      500,
    );
  }
});

app.put("/projects/:id/deliverables/:did", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const projectId = c.req.param("id");
    const did = c.req.param("did");
    const body = (await c.req.json()) as Record<string, unknown>;

    if (
      body.status !== undefined &&
      body.status !== null &&
      body.status !== "" &&
      !DELIVERABLE_STATUSES.has(body.status as string)
    ) {
      return c.json({ error: "Invalid deliverable status" }, 400);
    }

    const db = getApiDb();
    const values = childUpdateFields(projectDeliverables, body);
    if (Object.keys(values).length === 0) {
      return c.json({ error: "No fields" }, 400);
    }
    const [row] = await db
      .update(projectDeliverables)
      .set(values as typeof projectDeliverables.$inferInsert)
      .where(
        and(
          eq(projectDeliverables.id, did),
          eq(projectDeliverables.projectId, projectId),
        ),
      )
      .returning();
    if (!row) return c.json({ error: "Not found" }, 404);

    await logProjectActivity(db, {
      projectId,
      actorId: user.id,
      action: "deliverable_updated",
      metadata: { deliverableId: did, fields: Object.keys(body) },
    });

    return c.json(row);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to update deliverable") },
      500,
    );
  }
});

app.delete("/projects/:id/deliverables/:did", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const projectId = c.req.param("id");
    const did = c.req.param("did");
    const db = getApiDb();
    const [deleted] = await db
      .delete(projectDeliverables)
      .where(
        and(
          eq(projectDeliverables.id, did),
          eq(projectDeliverables.projectId, projectId),
        ),
      )
      .returning({ id: projectDeliverables.id });
    if (!deleted) return c.json({ error: "Not found" }, 404);

    await logProjectActivity(db, {
      projectId,
      actorId: user.id,
      action: "deliverable_deleted",
      metadata: { deliverableId: did },
    });

    return c.json({ success: true });
  } catch {
    return c.json({ error: "Failed to delete deliverable" }, 500);
  }
});

// ─── Activities ──────────────────────────────────────────────────────────────

app.get("/projects/:id/activities", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const projectId = c.req.param("id");
    const db = getApiDb();
    const rows = await db
      .select()
      .from(projectActivityLogs)
      .where(eq(projectActivityLogs.projectId, projectId))
      .orderBy(desc(projectActivityLogs.createdAt))
      .limit(50);
    // The detail page reads camelCase fields (projectId, createdAt).
    return c.json({
      activities: rows.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        actorId: r.actorId,
        action: r.action,
        metadata: r.metadata,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch activities") },
      500,
    );
  }
});

// ─── Portal access toggle ────────────────────────────────────────────────────

app.post("/projects/:id/portal", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const projectId = c.req.param("id");
    const db = getApiDb();

    const [project] = await db
      .select()
      .from(projectsFreelance)
      .where(eq(projectsFreelance.id, projectId))
      .limit(1);
    if (!project) return c.json({ error: "Not found" }, 404);

    const currentlyEnabled = project.portalAccessEnabled === true;

    if (currentlyEnabled) {
      await db
        .update(projectsFreelance)
        .set({ portalAccessEnabled: false, updatedAt: new Date() })
        .where(eq(projectsFreelance.id, projectId));
      await logProjectActivity(db, {
        projectId,
        actorId: user.id,
        action: "portal_disabled",
        metadata: {},
      });
      return c.json({ portalAccessEnabled: false });
    }

    // Enabling: mint a fresh token (Web Crypto — Workers-safe) and make
    // sure a portal_sessions row exists for the project. Without it the
    // portal setup page can never validate the token (it looks the token
    // up in portal_sessions, not on the project row).
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes, (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");

    // The portal session's client email comes from the project's linked
    // client (lead) when one is set.
    let clientEmail: string | null = null;
    if (project.clientId) {
      const [lead] = await db
        .select({ email: leads.email })
        .from(leads)
        .where(eq(leads.id, project.clientId))
        .limit(1);
      clientEmail = lead?.email ?? null;
    }

    const [existing] = await db
      .select()
      .from(portalSessions)
      .where(eq(portalSessions.projectId, projectId))
      .limit(1);
    if (existing) {
      await db
        .update(portalSessions)
        .set({ portalToken: token })
        .where(eq(portalSessions.projectId, projectId));
      if (!existing.clientEmail && clientEmail) {
        // bindClientEmail: only fill the email when none is stored yet.
        await db
          .update(portalSessions)
          .set({ clientEmail })
          .where(
            and(
              eq(portalSessions.projectId, projectId),
              isNull(portalSessions.clientEmail),
            ),
          );
      }
    } else {
      await db.insert(portalSessions).values({
        projectId,
        portalToken: token,
        clientEmail,
      });
    }

    await db
      .update(projectsFreelance)
      .set({
        portalAccessEnabled: true,
        portalToken: token,
        updatedAt: new Date(),
      })
      .where(eq(projectsFreelance.id, projectId));

    await logProjectActivity(db, {
      projectId,
      actorId: user.id,
      action: "portal_enabled",
      metadata: {},
    });

    return c.json({ portalAccessEnabled: true, portalToken: token });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to toggle portal access") },
      500,
    );
  }
});

export default app;
