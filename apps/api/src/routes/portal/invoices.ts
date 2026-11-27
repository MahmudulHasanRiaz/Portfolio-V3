// Portal invoices — list (with project title) and detail, for the
// signed-in client only.
import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { getApiDb } from "../../db";
import {
  financeInvoices,
  projectsFreelance,
} from "@repo/database/schema";
import {
  invalidParam,
  parsePagination,
  uuidParam,
} from "../../lib/validate";
import { portalError, requirePortalClient } from "./helpers";

const invoices = new Hono();

invoices.get("/", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const { page, pageSize } = parsePagination(c);
    const db = getApiDb();
    const rows = await db
      .select()
      .from(financeInvoices)
      .where(eq(financeInvoices.clientId, client.clientId))
      .orderBy(desc(financeInvoices.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    // An invoice links to its project via source_type/source_id
    // (source_type 'freelance_project'), not a project_id column.
    const projects = await db
      .select({ id: projectsFreelance.id, title: projectsFreelance.title })
      .from(projectsFreelance)
      .where(eq(projectsFreelance.clientId, client.clientId));
    const titles = new Map(projects.map((p) => [p.id, p.title]));
    return c.json({
      invoices: rows.map((r) => ({
        ...r,
        projectTitle:
          r.sourceType === "freelance_project" && r.sourceId
            ? (titles.get(r.sourceId) ?? null)
            : null,
      })),
      total: rows.length,
      page,
      pageSize,
    });
  } catch (err) {
    return c.json({ error: portalError(err, "Failed to fetch invoices") }, 500);
  }
});

invoices.get("/:id", async (c) => {
  try {
    const client = await requirePortalClient(c);
    if (!client) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [invoice] = await db
      .select()
      .from(financeInvoices)
      .where(
        and(
          eq(financeInvoices.id, id),
          eq(financeInvoices.clientId, client.clientId),
        ),
      )
      .limit(1);
    if (!invoice) return c.json({ error: "Invoice not found" }, 404);
    let projectTitle: string | null = null;
    if (invoice.sourceType === "freelance_project" && invoice.sourceId) {
      const [project] = await db
        .select({ title: projectsFreelance.title })
        .from(projectsFreelance)
        .where(eq(projectsFreelance.id, invoice.sourceId))
        .limit(1);
      projectTitle = project?.title ?? null;
    }
    return c.json({ ...invoice, projectTitle });
  } catch (err) {
    return c.json({ error: portalError(err, "Failed to fetch invoice") }, 500);
  }
});

export { invoices as portalInvoicesRouter };
