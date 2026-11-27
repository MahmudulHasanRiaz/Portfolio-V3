// Portal projects — read-only for the signed-in client.
// The list/detail shapes match the old Next.js routes; the portalToken
// column is never returned (it is the setup token).
import { Hono } from "hono";
import { and, asc, desc, eq } from "drizzle-orm";
import { getApiDb } from "../../db";
import {
  projectActivityLogs,
  projectDeliverables,
  projectMilestones,
  projectsFreelance,
} from "@repo/database/schema";
import { invalidParam, parsePagination, uuidParam } from "../../lib/validate";
import {
  getClientProject,
  portalError,
  requirePortalClient,
} from "./helpers";

const projects = new Hono();

const LIST_COLUMNS = {
  id: projectsFreelance.id,
  clientId: projectsFreelance.clientId,
  title: projectsFreelance.title,
  status: projectsFreelance.status,
  description: projectsFreelance.description,
  scopeNotes: projectsFreelance.scopeNotes,
  startDate: projectsFreelance.startDate,
  expectedEndDate: projectsFreelance.expectedEndDate,
  actualEndDate: projectsFreelance.actualEndDate,
  totalAgreedAmount: projectsFreelance.totalAgreedAmount,
  currency: projectsFreelance.currency,
  isPaidProject: projectsFreelance.isPaidProject,
  portalAccessEnabled: projectsFreelance.portalAccessEnabled,
  createdAt: projectsFreelance.createdAt,
  updatedAt: projectsFreelance.updatedAt,
} as const;

projects.get("/", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const rows = await db
      .select(LIST_COLUMNS)
      .from(projectsFreelance)
      .where(
        and(
          eq(projectsFreelance.clientId, client.clientId),
          eq(projectsFreelance.portalAccessEnabled, true),
        ),
      )
      .orderBy(desc(projectsFreelance.createdAt))
      .limit(50);
    return c.json({ projects: rows, total: rows.length });
  } catch (err) {
    return c.json({ error: portalError(err, "Failed to fetch projects") }, 500);
  }
});

projects.get("/:id", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const project = await getClientProject(db, id, client.clientId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    return c.json({
      id: project.id,
      title: project.title,
      status: project.status,
      description: project.description,
      scopeNotes: project.scopeNotes,
      startDate: project.startDate,
      expectedEndDate: project.expectedEndDate,
      actualEndDate: project.actualEndDate,
      totalAgreedAmount: project.totalAgreedAmount,
      currency: project.currency,
      isPaidProject: project.isPaidProject,
      createdAt: project.createdAt,
    });
  } catch (err) {
    return c.json({ error: portalError(err, "Failed to fetch project") }, 500);
  }
});

projects.get("/:id/activities", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const { page, pageSize } = parsePagination(c);
    const db = getApiDb();
    const project = await getClientProject(db, id, client.clientId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    const rows = await db
      .select()
      .from(projectActivityLogs)
      .where(eq(projectActivityLogs.projectId, id))
      .orderBy(desc(projectActivityLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({ activities: rows, total: rows.length, page, pageSize });
  } catch (err) {
    return c.json({ error: portalError(err, "Failed to fetch activities") }, 500);
  }
});

projects.get("/:id/milestones", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const project = await getClientProject(db, id, client.clientId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    const rows = await db
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, id))
      .orderBy(
        asc(projectMilestones.dueDate),
        asc(projectMilestones.sortOrder),
      );
    return c.json({ milestones: rows, total: rows.length });
  } catch (err) {
    return c.json({ error: portalError(err, "Failed to fetch milestones") }, 500);
  }
});

projects.get("/:id/deliverables", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const project = await getClientProject(db, id, client.clientId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    const rows = await db
      .select()
      .from(projectDeliverables)
      .where(eq(projectDeliverables.projectId, id))
      // No created_at column on this table — order by submitted date.
      .orderBy(desc(projectDeliverables.submittedAt));
    return c.json({ deliverables: rows, total: rows.length });
  } catch (err) {
    return c.json({ error: portalError(err, "Failed to fetch deliverables") }, 500);
  }
});

export { projects as portalProjectsRouter };
