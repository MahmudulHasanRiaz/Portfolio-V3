// Admin freelance project milestones — Hono port of the Next.js admin
// REST routes
// apps/admin/src/app/api/freelance/projects/[id]/milestones/route.ts and
// apps/admin/src/app/api/freelance/projects/[id]/milestones/[mid]/route.ts.
// Mounted at /api/admin/freelance by routes/admin/index.ts, so the full
// paths are /api/admin/freelance/projects/:id/milestones...
//
// Fidelity notes: auth via requireAuth on every route (no role check, as
// in V2); detail routes use PUT (not PATCH); response shapes match the
// sources (list maps to camelCase; create/update return the Drizzle row;
// delete returns { success: true }); 404s are "Not found".
import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  createProjectMilestoneSchema,
  updateProjectMilestoneSchema,
} from "@repo/validation";
import {
  milestoneStatus,
  projectMilestones,
} from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth, unauthorized } from "../../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import {
  childUpdateFields,
  errorMessage,
  logProjectActivity,
  sentFields,
} from "./helpers";

const app = new Hono();

// Adapted shared schemas (@repo/validation/freelance.ts).
// - Milestone create: projectId comes from the path and status is forced
//   (pending) by the route, so both are omitted; title is required (the
//   route requires it). sortOrder "" clears to null (then defaults to 0
//   on create).
// - Milestone update: projectId is never updatable; blank "" status
//   clears to null.
const createMilestoneLocalSchema = createProjectMilestoneSchema
  .omit({ projectId: true, status: true })
  .extend({
    title: z.string().min(1),
    sortOrder: z.preprocess(
      (v) => (v === "" ? null : v),
      z.coerce.number().int().nullable().optional(),
    ),
  });
const updateMilestoneLocalSchema = updateProjectMilestoneSchema
  .omit({ id: true, projectId: true, createdAt: true })
  .extend({
    status: z.preprocess(
      (v) => (v === "" ? null : v),
      z
        .enum(["pending", "in_progress", "completed", "approved"])
        .nullable()
        .optional(),
    ),
    sortOrder: z.preprocess(
      (v) => (v === "" ? null : v),
      z.coerce.number().int().nullable().optional(),
    ),
  });

// ─── Milestones ──────────────────────────────────────────────────────────────

app.get("/projects/:id/milestones", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const projectId = uuidParam(c, "id");
    if (!projectId) return invalidParam(c, "id");
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const projectId = uuidParam(c, "id");
    if (!projectId) return invalidParam(c, "id");
    const v = validateBody(body, createMilestoneLocalSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    if (v.data.title.trim() === "") {
      return c.json({ error: "Milestone title is required" }, 400);
    }

    const db = getApiDb();
    const id = crypto.randomUUID();
    const [row] = await db
      .insert(projectMilestones)
      .values({
        id,
        projectId,
        title: v.data.title,
        description: v.data.description || null,
        dueDate: v.data.dueDate || null,
        status: "pending" as (typeof milestoneStatus.enumValues)[number],
        sortOrder: v.data.sortOrder ?? 0,
        createdAt: new Date(),
      })
      .returning();
    if (!row) return c.json({ error: "Failed to create milestone" }, 500);

    await logProjectActivity(db, {
      projectId,
      actorId: user.id,
      action: "milestone_created",
      metadata: { milestoneId: id, title: v.data.title },
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const projectId = uuidParam(c, "id");
    if (!projectId) return invalidParam(c, "id");
    const mid = uuidParam(c, "mid");
    if (!mid) return invalidParam(c, "mid");
    const v = validateBody(body, updateMilestoneLocalSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);

    const db = getApiDb();
    const values = childUpdateFields(
      projectMilestones,
      sentFields(v.data, body),
    );
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
    const projectId = uuidParam(c, "id");
    if (!projectId) return invalidParam(c, "id");
    const mid = uuidParam(c, "mid");
    if (!mid) return invalidParam(c, "mid");
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

export default app;
