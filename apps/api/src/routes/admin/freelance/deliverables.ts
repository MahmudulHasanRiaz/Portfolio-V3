// Admin freelance project deliverables — Hono port of the Next.js admin
// REST routes
// apps/admin/src/app/api/freelance/projects/[id]/deliverables/route.ts and
// apps/admin/src/app/api/freelance/projects/[id]/deliverables/[did]/route.ts.
// Mounted at /api/admin/freelance by routes/admin/index.ts, so the full
// paths are /api/admin/freelance/projects/:id/deliverables...
//
// Fidelity notes: auth via requireAuth on every route (no role check, as
// in V2); detail routes use PUT (not PATCH); response shapes match the
// sources (list returns { deliverables } mapped to camelCase;
// create/update return the Drizzle row; delete returns { success: true });
// 404s are "Not found".
// Deliverables list ordering: the V2 source ordered by
// `created_at DESC NULLS LAST`, but the project_deliverables table has
// NO created_at column (migration 0000_loud_argent.sql + the Drizzle
// schema agree) — the V2 query errors at runtime (42703). The port
// therefore returns the rows unordered rather than inventing a sort
// key or keeping a query that can never succeed.
import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  createProjectDeliverableSchema,
  updateProjectDeliverableSchema,
} from "@repo/validation";
import {
  deliverableStatus,
  projectDeliverables,
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
// - Deliverable create: projectId comes from the path and status is
//   forced (pending) by the route, so both are omitted; title is
//   required (the route requires it).
// - Deliverable update: projectId is never updatable; blank "" status
//   clears to null.
// - Deliverable fileUrl is a plain string capped at 2048 chars. It is
//   NOT .url()-validated: the audit could not confirm the route
//   requires a URL (relative paths / storage keys may be valid).
const createDeliverableLocalSchema = createProjectDeliverableSchema
  .omit({ projectId: true, status: true })
  .extend({
    title: z.string().min(1),
    fileUrl: z.string().max(2048).optional(),
  });
// NOTE: the shared deliverable schema has no createdAt column, so it
// is not omitted here (omitting a non-existent key is a type error).
const updateDeliverableLocalSchema = updateProjectDeliverableSchema
  .omit({ id: true, projectId: true })
  .extend({
    status: z.preprocess(
      (v) => (v === "" ? null : v),
      z
        .enum(["pending", "submitted", "approved", "revision_requested"])
        .nullable()
        .optional(),
    ),
    fileUrl: z.string().max(2048).optional(),
  });

// ─── Deliverables ────────────────────────────────────────────────────────────

app.get("/projects/:id/deliverables", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json(unauthorized(), 401);
    const projectId = uuidParam(c, "id");
    if (!projectId) return invalidParam(c, "id");
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const projectId = uuidParam(c, "id");
    if (!projectId) return invalidParam(c, "id");
    const v = validateBody(body, createDeliverableLocalSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    if (v.data.title.trim() === "") {
      return c.json({ error: "Deliverable title is required" }, 400);
    }

    const db = getApiDb();
    const id = crypto.randomUUID();
    const [row] = await db
      .insert(projectDeliverables)
      .values({
        id,
        projectId,
        milestoneId: v.data.milestoneId ?? null,
        title: v.data.title,
        fileUrl:
          typeof v.data.fileUrl === "string" && v.data.fileUrl.trim() !== ""
            ? v.data.fileUrl.trim()
            : null,
        notes:
          typeof v.data.notes === "string" && v.data.notes.trim() !== ""
            ? v.data.notes.trim()
            : null,
        status: "pending" as (typeof deliverableStatus.enumValues)[number],
      })
      .returning();
    if (!row) return c.json({ error: "Failed to create deliverable" }, 500);

    await logProjectActivity(db, {
      projectId,
      actorId: user.id,
      action: "deliverable_created",
      metadata: { deliverableId: id, title: v.data.title },
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const projectId = uuidParam(c, "id");
    if (!projectId) return invalidParam(c, "id");
    const did = uuidParam(c, "did");
    if (!did) return invalidParam(c, "did");
    const v = validateBody(body, updateDeliverableLocalSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);

    const db = getApiDb();
    const values = childUpdateFields(
      projectDeliverables,
      sentFields(v.data, body),
    );
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
    const projectId = uuidParam(c, "id");
    if (!projectId) return invalidParam(c, "id");
    const did = uuidParam(c, "did");
    if (!did) return invalidParam(c, "did");
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

export default app;
