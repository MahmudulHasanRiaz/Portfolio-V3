// Admin leads CRUD (items) — moved verbatim from routes/admin/leads.ts.
// Hono port of the Next.js admin REST routes under
// apps/admin/src/app/api/leads/ (route.ts, [id]/route.ts,
// [id]/activities/route.ts, [id]/assign/route.ts, [id]/status/route.ts,
// follow-up/route.ts, stats/route.ts).
//
// Mounted at /api/admin/leads (see routes/admin/index.ts).
//
// Fidelity notes:
// - Response shapes match the Next.js routes exactly: list returns
//   { leads, total, page, pageSize, totalPages }; get returns the bare
//   lead with `activities` (recent 50, newest first) and `notes`
//   (newest first); create/update/assign/status return the bare row;
//   delete returns { success: true }.
// - Update is PATCH (not PUT), matching the sources and the admin UI
//   (lead-profile.tsx uses PATCH). Status change and assign are POST,
//   matching the sources.
// - Drizzle rows are already keyed by the schema's camelCase property
//   names, so no case conversion is applied. NOTE: the original
//   Activity/Note repos returned raw snake_case rows (SELECT *), while
//   the dashboard components read camelCase (activityType, createdAt,
//   isInternal, ...); Drizzle returns camelCase, which is what the UI
//   declares.
// - Create/update take the body verbatim through the lead-column
//   allowlist (getTableColumns), as in releases.ts: create skips null
//   values so DB defaults apply (status "new", slaMinutes 15);
//   update sets nulls; `id` / `createdAt` / `updatedAt` are never
//   taken from the body; unknown keys are dropped.
// - Delete removes the child notes/activities first (no FK cascade),
//   as in LeadRepository.delete — sequential statements, because
//   Neon HTTP does not support db.transaction().
// - createdBy is stamped with the session user id, as in the sources
//   and the other Hono routers (content/releases/ventures).
// - The /follow-up and /stats routes are registered BEFORE /:id so the
//   static segments win over the :id param.
// - These sources have no purgePublicCache / search-indexer calls.
//
// Side effects (wired at cutover via lib/side-effects): the original
// routes also (a) dispatchTrigger(..., "lead_created", ...) after a
// lead is created, (b) dispatchTrigger(..., "lead_status_changed", ...)
// after a status change, and (c) link page views to the new lead via
// LeadAttributionService.linkPageViewsToLead(visitorId, lead.id) when
// a visitorId is supplied.
import { Hono } from "hono";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import {
  leadSchema,
  updateLeadSchema,
  uuidSchema,
} from "@repo/validation";
import {
  leadActivities,
  leadNotes,
  leadStatus,
  leads,
} from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  parsePagination,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import { dispatchTrigger, linkPageViewsToLead, waitUntilOf } from "../../../lib/side-effects";
import { Env, errorMessage, logActivity } from "./helpers";

const app = new Hono<Env>();

const LEAD_COLUMNS = getTableColumns(leads);

// The lead status enum, reused from the shared lead schema
// (@repo/validation/crm.ts) — the single source of truth, replacing the
// hand-maintained VALID_STATUSES list.
const leadStatusSchema = leadSchema.shape.status;

function isValidDateString(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

// POST / create validation (LOCAL relaxed schema — deliberately NOT
// createLeadSchema: the route allows nameless / email-only leads, the
// status defaults to "new" in the DB, and createdBy is stamped from
// the session. Every field is optional; types mirror createLeadSchema
// (email shape, uuids, utm caps). budget is a text column, so a numeric
// budget is coerced to a string; slaMinutes is an integer column.
// visitorId is not a lead column — it is destructured out below and
// used only to link page views. The schema has no id / createdBy /
// createdAt / updatedAt, so those can never be client-set.
const createLeadRelaxedSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().max(255).email().optional(),
  phone: z.string().max(50).optional(),
  company: z.string().optional(),
  country: z.string().max(100).optional(),
  budget: z.coerce.string().optional(),
  timeline: z.string().optional(),
  projectType: z.string().optional(),
  inquiryType: z.string().max(50).optional(),
  message: z.string().optional(),
  leadSource: z.string().max(50).optional(),
  status: leadStatusSchema.optional(),
  assignedUserId: uuidSchema.optional(),
  followUpDate: z.string().optional(),
  followUpNotes: z.string().optional(),
  convertedToProjectId: uuidSchema.optional(),
  convertedToEventId: uuidSchema.optional(),
  utmSource: z.string().max(255).optional(),
  utmMedium: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmContent: z.string().max(255).optional(),
  utmTerm: z.string().max(255).optional(),
  slaMinutes: z.coerce.number().int().optional(),
  firstResponseAt: z.string().datetime().optional(),
  responseStatus: z.enum(["within_sla", "warning", "breached"]).optional(),
  visitorId: z.string().optional(),
});

// POST /:id/assign: unassign is null / omitted.
const assignLeadSchema = z.object({
  assignedUserId: uuidSchema.nullable().optional(),
});

// POST /:id/status.
const changeLeadStatusSchema = z.object({ status: leadStatusSchema });

/** Validated data restricted to keys the client actually sent. Needed
 *  for PATCH: updateLeadSchema is leadSchema.partial() and its
 *  slaMinutes field carries a .default(15), which Zod fires even when
 *  the client sent nothing — without this filter every PATCH would
 *  silently reset slaMinutes to 15. */
function sentFields(
  data: Record<string, unknown>,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key in body) out[key] = value;
  }
  return out;
}

/** Strip server-managed fields from validated data before any DB write. */
function stripServerFields(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...data };
  delete out.id;
  delete out.createdBy;
  delete out.createdAt;
  delete out.updatedAt;
  return out;
}

/**
 * Map a dashboard-form body to lead insert/update values.
 * Mirrors LeadRepository.create/update: camelCase keys are table
 * columns, `id` / `createdAt` / `updatedAt` are skipped. With
 * skipNulls (create) null values are dropped so DB defaults apply;
 * without it (update) nulls are set, as in the repository.
 */
function leadFields(
  body: Record<string, unknown>,
  skipNulls: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "id" || key === "createdAt" || key === "updatedAt") continue;
    if (!(key in LEAD_COLUMNS)) continue;
    if (value === undefined) continue;
    if (value === null && skipNulls) continue;
    out[key] = value;
  }
  return out;
}

async function getLeadById(
  db: ReturnType<typeof getApiDb>,
  id: string,
) {
  const [row] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, id))
    .limit(1);
  return row ?? null;
}

// ─── List ────────────────────────────────────────────────────────────────────

// GET / — list (LeadRepository.list)
app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query.bind(c.req); // NB: query() reads this.url, so it must stay bound to c.req.
    const status = q("status");
    const source = q("source");
    const assignedTo = q("assignedTo");
    const search = q("search");
    const dateFrom = q("dateFrom");
    const dateTo = q("dateTo");
    if (status !== undefined && !leadStatusSchema.safeParse(status).success) {
      return c.json({ error: "Invalid status" }, 400);
    }
    if (
      assignedTo !== undefined &&
      !uuidSchema.safeParse(assignedTo).success
    ) {
      return c.json({ error: "Invalid uuid" }, 400);
    }
    if (dateFrom !== undefined && !isValidDateString(dateFrom)) {
      return c.json({ error: "Invalid dateFrom" }, 400);
    }
    if (dateTo !== undefined && !isValidDateString(dateTo)) {
      return c.json({ error: "Invalid dateTo" }, 400);
    }
    const { page, pageSize } = parsePagination(c);

    const conditions: any[] = [];
    if (status) {
      conditions.push(
        eq(leads.status, status as (typeof leadStatus.enumValues)[number]),
      );
    }
    if (source) {
      conditions.push(eq(leads.leadSource, source));
    }
    if (assignedTo) {
      conditions.push(eq(leads.assignedUserId, assignedTo));
    }
    if (search) {
      conditions.push(
        or(
          ilike(leads.fullName, `%${search}%`),
          ilike(leads.email, `%${search}%`),
          ilike(leads.company, `%${search}%`),
          ilike(leads.phone, `%${search}%`),
        ),
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!Number.isNaN(from.getTime())) {
        conditions.push(gte(leads.createdAt, from));
      }
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (!Number.isNaN(to.getTime())) {
        conditions.push(lte(leads.createdAt, to));
      }
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const db = getApiDb();
    const [countRow] = await db
      .select({ total: count() })
      .from(leads)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(leads)
      .where(where)
      .orderBy(desc(leads.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return c.json({
      leads: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch leads") }, 500);
  }
});

// POST / — create (LeadRepository.create + activities.log)
// No fullName requirement on purpose: the column is nullable and the UI
// renders nameless leads as "Unnamed" — abandoned captures are often
// email-only, and the Recovery flow creates leads from them.
app.post("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const v = validateBody(body, createLeadRelaxedSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const { visitorId, ...leadData } = stripServerFields(v.data);
    const db = getApiDb();
    const [lead] = await db
      .insert(leads)
      .values({
        ...leadFields(leadData, true),
        createdBy: user.id,
      } as typeof leads.$inferInsert)
      .returning();
    if (!lead) return c.json({ error: "Failed to create lead" }, 500);
    await logActivity(
      db,
      lead.id,
      "lead_created",
      "Lead created via form/manual entry",
      user.id,
      { source: leadData.leadSource },
    );
    await dispatchTrigger(db, "lead_created", lead.id, { ...lead, triggeredBy: user.id });
    if (typeof visitorId === "string" && visitorId !== "") {
      void linkPageViewsToLead(db, visitorId, lead.id, waitUntilOf(c));
    }
    return c.json(lead, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to create lead") }, 500);
  }
});

// ─── Follow-up queue + stats (registered BEFORE /:id) ───────────────────────

// GET /follow-up — leads whose follow-up date is today or past and whose
// status is not terminal (LeadRepository.getFollowUpQueue).
app.get("/follow-up", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const rows = await db
      .select()
      .from(leads)
      .where(
        and(
          lte(leads.followUpDate, sql`CURRENT_DATE`),
          sql`${leads.status} NOT IN ('won', 'lost', 'archived')`,
        ),
      )
      .orderBy(asc(leads.followUpDate));
    return c.json(rows);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch follow-up queue") },
      500,
    );
  }
});

// GET /stats — aggregate pipeline counts computed in SQL.
// The Overview tab used to count client-side from a capped (200-row)
// list fetch, so totals were wrong once the pipeline grew past 200 leads.
app.get("/stats", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [byStatus, bySource, conversionRows] = await Promise.all([
      db
        .select({
          status: leads.status,
          count: sql<number>`count(*)::int`,
        })
        .from(leads)
        .groupBy(leads.status)
        .orderBy(leads.status),
      db
        .select({
          source: sql<string>`coalesce(${leads.leadSource}, 'unknown')`,
          count: sql<number>`count(*)::int`,
        })
        .from(leads)
        .groupBy(leads.leadSource)
        .orderBy(desc(sql<number>`count(*)::int`)),
      db
        .select({
          converted:
            sql<number>`count(*) filter (where ${leads.status} = 'won')::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(leads),
    ]);
    const conversion = conversionRows[0] ?? { converted: 0, total: 0 };
    const total = Number(conversion.total ?? 0);
    const converted = Number(conversion.converted ?? 0);
    return c.json({
      total,
      converted,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      byStatus,
      bySource,
    });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch lead stats") },
      500,
    );
  }
});

// ─── Single lead ─────────────────────────────────────────────────────────────

// GET /:id — one lead with recent activities + notes.
app.get("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const lead = await getLeadById(db, id);
    if (!lead) return c.json({ error: "Lead not found" }, 404);
    const [activityList, noteList] = await Promise.all([
      db
        .select()
        .from(leadActivities)
        .where(eq(leadActivities.leadId, id))
        .orderBy(desc(leadActivities.createdAt))
        .limit(50),
      db
        .select()
        .from(leadNotes)
        .where(eq(leadNotes.leadId, id))
        .orderBy(desc(leadNotes.createdAt)),
    ]);
    return c.json({ ...lead, activities: activityList, notes: noteList });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch lead") }, 500);
  }
});

// PATCH /:id — update (LeadRepository.update + activities.log).
app.patch("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const v = validateBody(body, updateLeadSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    const values = leadFields(
      stripServerFields(sentFields(v.data, body)),
      false,
    );
    let lead;
    if (Object.keys(values).length === 0) {
      // No updatable fields — the repository returns the existing row.
      lead = await getLeadById(db, id);
    } else {
      [lead] = await db
        .update(leads)
        .set({ ...values, updatedAt: new Date() } as typeof leads.$inferInsert)
        .where(eq(leads.id, id))
        .returning();
    }
    if (!lead) return c.json({ error: "Lead not found" }, 404);
    await logActivity(db, id, "lead_updated", "Lead information updated", user.id, {
      updatedFields: Object.keys(body),
    });
    return c.json(lead);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to update lead") }, 500);
  }
});

// DELETE /:id — delete lead + child notes/activities first.
app.delete("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    await db.delete(leadNotes).where(eq(leadNotes.leadId, id));
    await db.delete(leadActivities).where(eq(leadActivities.leadId, id));
    const [deleted] = await db
      .delete(leads)
      .where(eq(leads.id, id))
      .returning({ id: leads.id });
    if (!deleted) return c.json({ error: "Lead not found" }, 404);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to delete lead") }, 500);
  }
});

// ─── Activities ──────────────────────────────────────────────────────────────

// GET /:id/activities — full activity list, oldest first
// (ActivityRepository.getByLeadId).
app.get("/:id/activities", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const rows = await db
      .select()
      .from(leadActivities)
      .where(eq(leadActivities.leadId, id))
      .orderBy(asc(leadActivities.createdAt));
    return c.json(rows);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch activities") },
      500,
    );
  }
});

// ─── Assign ──────────────────────────────────────────────────────────────────

// POST /:id/assign — assign (or unassign) a lead.
app.post("/:id/assign", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    // assigned_user_id is a uuid column: reject non-uuid values with a
    // 400 instead of letting the ::uuid cast surface a 500. (Better
    // Auth ids are opaque text, not uuids — assignees come from the
    // `users` table via GET /api/users.)
    const v = validateBody(body, assignLeadSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const assignedUserId = v.data.assignedUserId ?? null;

    const db = getApiDb();
    const [lead] = await db
      .update(leads)
      .set({
        assignedUserId,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();
    if (!lead) return c.json({ error: "Lead not found" }, 404);
    await logActivity(
      db,
      id,
      "lead_assigned",
      assignedUserId ? `Assigned to user ${assignedUserId}` : "Unassigned",
      user.id,
      { assignedUserId: assignedUserId ?? null },
    );
    return c.json(lead);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to assign lead") }, 500);
  }
});

// ─── Status ──────────────────────────────────────────────────────────────────

// POST /:id/status — change status (LeadRepository.changeStatus +
// activities.log). Status values are allow-listed so an invalid enum
// value fails with a 400 instead of letting the enum cast surface a 500.
app.post("/:id/status", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const v = validateBody(body, changeLeadStatusSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const newStatus = v.data.status;
    const db = getApiDb();
    const [lead] = await db
      .update(leads)
      .set({
        status: newStatus as (typeof leadStatus.enumValues)[number],
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();
    if (!lead) return c.json({ error: "Lead not found" }, 404);
    await logActivity(
      db,
      id,
      "status_changed",
      `Status changed to ${newStatus}`,
      user.id,
      { newStatus },
    );
    await dispatchTrigger(db, "lead_status_changed", id, { lead, newStatus, triggeredBy: user.id });
    return c.json(lead);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to change lead status") },
      500,
    );
  }
});

export default app;
