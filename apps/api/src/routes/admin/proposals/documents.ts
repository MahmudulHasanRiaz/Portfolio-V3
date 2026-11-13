// Admin proposal documents — split from routes/admin/proposals.ts
// (move-only refactor, no behavior change). Mounted at
// /api/admin/proposals via proposals/index.ts.
//
// Fidelity notes (from the original file):
// - Response shapes match the Next.js routes exactly: document list
//   returns { documents, total, page, pageSize, totalPages };
//   get/generate/version return the bare row (generate/version: 201);
//   accept returns { document, projectId, projectCreated }; delete
//   returns { success: true }; versions returns the bare chain array.
// - Documents have NO PUT route in the source (GET + DELETE only).
//   Version creation is POST /documents/:id/version (not GET).
// - Every version is a separate proposal_documents row (previous
//   versions stay as history); a new version starts as a draft with
//   no sent/accepted/rejected timestamps, version = source + 1, and
//   parentDocumentId = source id.
// - Accept is allowed only from "sent"; send only from "draft";
//   reject only from "sent". A document that does not exist fails
//   accept with a 404 (DocumentNotFoundError) but fails send/reject
//   with the same 400 as a wrong-status document, exactly as in the
//   source (markSent/reject do a conditional UPDATE and return null
//   when no row matches, without an existence check).
// - Accept auto-creates a projects_freelance row (titled with the
//   template name, or "Proposal Project") when the document is not
//   linked to a project yet, and links it back, per the PRD note in
//   the source repository.
// - Drizzle rows are already keyed by the schema's camelCase property
//   names, so no case conversion is applied (the source repos aliased
//   every column to camelCase the same way).
// - These sources have no purgePublicCache / search-indexer calls.
//
// PDF: GET /documents/:id/pdf (+ POST alias) — pdf-lib port of
// apps/dashboard/src/app/api/proposals/documents/[id]/pdf/route.ts
// via apps/dashboard/src/lib/pdf.ts generateProposalPdf + storePdf.
// pdfkit (Node-only) is NOT used; pdf-lib is pure JS and Workers-safe.
// The generated PDF is stored in R2 under documents/ (direct PutObject,
// where the source uploaded via a presigned PUT URL — same object, same
// public URL) and the row's pdfUrl is updated, exactly as the source.
// GET returns the PDF bytes as an attachment (the Hono download form);
// POST returns { pdfUrl }, the shape the admin UI expects (it POSTs and
// window.open()s the returned URL).
//
// Workflow trigger: the accept route dispatches "proposal_accepted" —
// isolated in a try/catch so a workflow failure never fails the
// acceptance itself, exactly as the source. The dispatch itself only
// records pending workflow_runs rows (the TriggerRegistry.dispatch
// equivalent, re-implemented here with direct Drizzle because
// routes/admin/workflows/index.ts does not re-export dispatchTrigger and
// @repo/workflows is postgres.js-bound); execution happens via
// /workflows/process or the cron tick. These sources have no
// purgePublicCache / search-indexer calls.
import { Hono } from "hono";
import { z } from "zod";
import { uuidSchema } from "@repo/validation";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  sql,
} from "drizzle-orm";
import {
  freelanceProjectStatus,
  proposalDocStatus,
  proposalDocuments,
  projectsFreelance,
  workflowRuns,
  workflows,
} from "@repo/database/schema";
import { getApiDb, type ApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  invalidParam,
  parsePagination,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import {
  errorMessage,
  getDocumentById,
  getTemplateById,
  isRecord,
  proposalPdf,
  type Env,
} from "./helpers";

const app = new Hono<Env>();

/**
 * Substitutes {{key}} placeholders in template content with the given
 * variables. Whitespace inside the braces is allowed ({{ key }}).
 * Placeholders without a matching variable are left untouched.
 */
function substituteVariables(
  content: string,
  variables: Record<string, string>,
): string {
  return content.replace(
    /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g,
    (match, key: string) =>
      Object.prototype.hasOwnProperty.call(variables, key)
        ? variables[key]!
        : match,
  );
}

// ─── Workflow dispatch (TriggerRegistry.dispatch port) ───────────────────────
// See the same helper in routes/admin/finance/helpers.ts: @repo/workflows
// dispatchTrigger is postgres.js-bound and routes/admin/workflows/index.ts
// does not re-export its Drizzle port, so the two queries are repeated
// here. Dispatch only records pending workflow_runs rows; execution
// happens via POST /workflows/process or the cron tick.
async function dispatchWorkflowTrigger(
  db: ApiDb,
  triggerType: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const matched = await db
    .select()
    .from(workflows)
    .where(
      and(
        eq(workflows.triggerType, triggerType),
        eq(workflows.isActive, true),
      ),
    )
    .orderBy(asc(workflows.createdAt));
  const cleanPayload = JSON.parse(JSON.stringify(payload)) as Record<
    string,
    unknown
  >;
  for (const workflow of matched) {
    await db.insert(workflowRuns).values({
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      triggerType,
      triggerEntityId: entityId,
      triggerPayload: cleanPayload,
      status: "pending",
    });
  }
}

// POST /documents body: templateId is a uuid; variable VALUES must be
// strings (this fixes the old `[object Object]` interpolation when a
// variable value was an object/array).
const createDocumentSchema = z.object({
  templateId: uuidSchema,
  projectId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

// POST /documents/:id/version body.
const createDocumentVersionSchema = z.object({
  variables: z.record(z.string(), z.string()).optional(),
  resolvedContent: z.string().max(100000).optional(),
});

// POST /documents/:id/reject body (trimmed, so a whitespace-only
// reason still fails as before).
const rejectDocumentSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

// GET /documents query enum.
const proposalDocStatusSchema = z.enum([
  "draft",
  "sent",
  "accepted",
  "rejected",
]);

// ─── Documents ───────────────────────────────────────────────────────────────

// GET /documents — list (ProposalDocumentRepository.list)
app.get("/documents", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query.bind(c.req); // NB: query() reads this.url, so it must stay bound to c.req.
    const clientId = q("clientId");
    const projectId = q("projectId");
    const templateId = q("templateId");
    const statusParam = q("status");
    const latestOnly = q("latestOnly") === "true";
    for (const [name, value] of [
      ["clientId", clientId],
      ["projectId", projectId],
      ["templateId", templateId],
    ] as const) {
      if (value !== undefined && !uuidSchema.safeParse(value).success) {
        return c.json({ error: `Invalid ${name}` }, 400);
      }
    }
    if (statusParam !== undefined) {
      const statuses = statusParam
        .split(",")
        .map((st) => st.trim())
        .filter(Boolean);
      for (const st of statuses) {
        if (!proposalDocStatusSchema.safeParse(st).success) {
          return c.json({ error: "Invalid status" }, 400);
        }
      }
    }
    const { page, pageSize } = parsePagination(c);

    const conditions: any[] = [];
    if (clientId) {
      conditions.push(eq(proposalDocuments.clientId, clientId));
    }
    if (projectId) {
      conditions.push(eq(proposalDocuments.projectId, projectId));
    }
    if (templateId) {
      conditions.push(eq(proposalDocuments.templateId, templateId));
    }
    if (statusParam) {
      const statuses = statusParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      conditions.push(
        inArray(
          proposalDocuments.status,
          statuses as (typeof proposalDocStatus.enumValues)[number][],
        ),
      );
    }
    if (latestOnly) {
      conditions.push(
        sql`NOT EXISTS (SELECT 1 FROM proposal_documents AS child WHERE child.parent_document_id = ${proposalDocuments.id})`,
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const db = getApiDb();
    const [countRow] = await db
      .select({ total: count() })
      .from(proposalDocuments)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(proposalDocuments)
      .where(where)
      .orderBy(desc(proposalDocuments.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return c.json({
      documents: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch proposal documents") },
      500,
    );
  }
});

// POST /documents — generate a new draft document (version 1) from a
// template by substituting the given variables into the template content.
app.post("/documents", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const v = validateBody(body, createDocumentSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const { templateId, projectId, clientId, variables } = v.data;

    const db = getApiDb();
    const template = await getTemplateById(db, templateId);
    if (!template) {
      return c.json(
        { error: `Proposal template not found: ${templateId}` },
        404,
      );
    }
    // An admin-deactivated template must not generate new documents.
    // isActive is null for legacy rows: treat null as active so old
    // templates keep working.
    if (template.isActive === false) {
      return c.json(
        {
          error: `Proposal template is inactive and cannot generate documents: ${templateId}`,
        },
        400,
      );
    }

    const resolvedContent = substituteVariables(
      template.content ?? "",
      variables ?? {},
    );
    const [document] = await db
      .insert(proposalDocuments)
      .values({
        templateId,
        projectId: projectId ?? null,
        clientId: clientId ?? null,
        resolvedContent,
        status: "draft",
        version: 1,
        parentDocumentId: null,
        createdBy: user.id,
      })
      .returning();
    if (!document) {
      return c.json({ error: "Failed to generate proposal document" }, 500);
    }
    return c.json(document, 201);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to generate proposal document") },
      500,
    );
  }
});

// GET /documents/:id/pdf — PDF download; POST — source shape { pdfUrl }.
// Registered BEFORE /documents/:id so the static "pdf" segment wins.
app.get("/documents/:id/pdf", async (c) => {
  const id = uuidParam(c, "id");
  if (!id) return invalidParam(c, "id");
  return proposalPdf(c, true, id);
});
app.post("/documents/:id/pdf", async (c) => {
  const id = uuidParam(c, "id");
  if (!id) return invalidParam(c, "id");
  return proposalPdf(c, false, id);
});

// GET /documents/:id — one document.
app.get("/documents/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const document = await getDocumentById(db, id);
    if (!document) {
      return c.json({ error: "Proposal document not found" }, 404);
    }
    return c.json(document);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch proposal document") },
      500,
    );
  }
});

// DELETE /documents/:id — delete a document.
app.delete("/documents/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [deleted] = await db
      .delete(proposalDocuments)
      .where(eq(proposalDocuments.id, id))
      .returning({ id: proposalDocuments.id });
    if (!deleted) {
      return c.json({ error: "Proposal document not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to delete proposal document") },
      500,
    );
  }
});

// POST /documents/:id/accept — mark a sent document accepted; when the
// document is not linked to a project yet, a projects_freelance record
// is auto-created and linked back.
app.post("/documents/:id/accept", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const existing = await getDocumentById(db, id);
    if (!existing) {
      return c.json({ error: `Proposal document not found: ${id}` }, 404);
    }
    const [document] = await db
      .update(proposalDocuments)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(
        and(
          eq(proposalDocuments.id, id),
          eq(proposalDocuments.status, "sent"),
        ),
      )
      .returning();
    if (!document) {
      return c.json(
        {
          error:
            "Document cannot be accepted. Only sent documents can be accepted.",
        },
        400,
      );
    }

    if (document.projectId) {
      // Workflow dispatch is isolated: a workflow failure must never
      // fail the acceptance itself.
      try {
        await dispatchWorkflowTrigger(db, "proposal_accepted", id, {
          ...document,
          projectId: document.projectId,
          projectCreated: false,
          triggeredBy: user.id,
        });
      } catch (err) {
        console.error(
          "[Proposals API] Failed to dispatch proposal_accepted:",
          err,
        );
      }
      return c.json({
        document,
        projectId: document.projectId,
        projectCreated: false,
      });
    }

    let title = "Proposal Project";
    if (document.templateId) {
      const template = await getTemplateById(db, document.templateId);
      if (template?.name) title = template.name;
    }
    const [project] = await db
      .insert(projectsFreelance)
      .values({
        title,
        clientId: document.clientId,
        status:
          "draft" as (typeof freelanceProjectStatus.enumValues)[number],
        createdBy: document.createdBy,
      })
      .returning({ id: projectsFreelance.id });
    if (!project) {
      return c.json({ error: "Failed to create freelance project" }, 500);
    }
    const [linked] = await db
      .update(proposalDocuments)
      .set({ projectId: project.id })
      .where(eq(proposalDocuments.id, id))
      .returning();
    // Workflow dispatch is isolated: a workflow failure must never fail
    // the acceptance itself.
    try {
      await dispatchWorkflowTrigger(db, "proposal_accepted", id, {
        ...(linked ?? document),
        projectId: project.id,
        projectCreated: true,
        triggeredBy: user.id,
      });
    } catch (err) {
      console.error(
        "[Proposals API] Failed to dispatch proposal_accepted:",
        err,
      );
    }
    return c.json({
      document: linked ?? document,
      projectId: project.id,
      projectCreated: true,
    });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to accept proposal document") },
      500,
    );
  }
});

// POST /documents/:id/reject — reject a sent document; `reason` required.
app.post("/documents/:id/reject", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const v = validateBody(body, rejectDocumentSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const reason = v.data.reason;
    const db = getApiDb();
    const [document] = await db
      .update(proposalDocuments)
      .set({
        status: "rejected",
        rejectedAt: new Date(),
        rejectionReason: reason,
      })
      .where(
        and(
          eq(proposalDocuments.id, id),
          eq(proposalDocuments.status, "sent"),
        ),
      )
      .returning();
    if (!document) {
      return c.json(
        {
          error:
            "Document cannot be rejected. Only sent documents can be rejected.",
        },
        400,
      );
    }
    return c.json(document);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to reject proposal document") },
      500,
    );
  }
});

// POST /documents/:id/send — mark a draft document sent.
app.post("/documents/:id/send", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [document] = await db
      .update(proposalDocuments)
      .set({ status: "sent", sentAt: new Date() })
      .where(
        and(
          eq(proposalDocuments.id, id),
          eq(proposalDocuments.status, "draft"),
        ),
      )
      .returning();
    if (!document) {
      return c.json(
        {
          error:
            "Document cannot be sent. Only draft documents can be marked as sent.",
        },
        400,
      );
    }
    return c.json(document);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to send proposal document") },
      500,
    );
  }
});

// POST /documents/:id/version — create the next version as a NEW row
// (versioning model: every version is a separate proposal_documents
// row, previous versions stay as history). The new row starts as a
// draft with no sent/accepted/rejected timestamps.
app.post("/documents/:id/version", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const v = validateBody(body, createDocumentVersionSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const { variables, resolvedContent } = v.data;

    const db = getApiDb();
    const source = await getDocumentById(db, id);
    if (!source) {
      return c.json({ error: `Proposal document not found: ${id}` }, 404);
    }

    let nextResolvedContent: string | null;
    if (resolvedContent !== undefined) {
      nextResolvedContent = resolvedContent;
    } else if (variables) {
      if (source.templateId) {
        const template = await getTemplateById(db, source.templateId);
        if (!template) {
          return c.json(
            { error: `Proposal template not found: ${source.templateId}` },
            404,
          );
        }
        nextResolvedContent = substituteVariables(
          template.content ?? "",
          variables,
        );
      } else {
        nextResolvedContent = source.resolvedContent;
      }
    } else {
      nextResolvedContent = source.resolvedContent;
    }

    const [document] = await db
      .insert(proposalDocuments)
      .values({
        templateId: source.templateId,
        projectId: source.projectId,
        clientId: source.clientId,
        resolvedContent: nextResolvedContent,
        status: "draft",
        version: source.version + 1,
        parentDocumentId: source.id,
        createdBy: source.createdBy,
      })
      .returning();
    if (!document) {
      return c.json(
        { error: "Failed to create proposal document version" },
        500,
      );
    }
    return c.json(document, 201);
  } catch (err) {
    return c.json(
      {
        error: errorMessage(
          err,
          "Failed to create proposal document version",
        ),
      },
      500,
    );
  }
});

// GET /documents/:id/versions — every document in the version chain
// the given document belongs to, from the root ancestor (version 1)
// down to the latest descendant, ordered by version ascending.
app.get("/documents/:id/versions", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const existing = await getDocumentById(db, id);
    if (!existing) {
      return c.json({ error: `Proposal document not found: ${id}` }, 404);
    }

    // Walk up to the root ancestor (cycle-guarded).
    let root = existing;
    const seenUp = new Set([existing.id]);
    while (root.parentDocumentId) {
      if (seenUp.has(root.parentDocumentId)) break;
      const parent = await getDocumentById(db, root.parentDocumentId);
      if (!parent) break;
      seenUp.add(parent.id);
      root = parent;
    }

    // Walk down from the root through all descendants.
    const chain = [root];
    const queue = [root];
    const seenDown = new Set([root.id]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = await db
        .select()
        .from(proposalDocuments)
        .where(eq(proposalDocuments.parentDocumentId, current.id));
      for (const child of children) {
        if (seenDown.has(child.id)) continue;
        seenDown.add(child.id);
        chain.push(child);
        queue.push(child);
      }
    }
    chain.sort((a, b) => a.version - b.version);
    return c.json(chain);
  } catch (err) {
    return c.json(
      {
        error: errorMessage(
          err,
          "Failed to fetch proposal document versions",
        ),
      },
      500,
    );
  }
});

export default app;
