// Admin proposals CRUD — Hono port of the Next.js admin REST routes under
// apps/admin/src/app/api/proposals/ (documents/route.ts,
// documents/[id]/route.ts, documents/[id]/{accept,reject,send,version,
// versions}/route.ts, templates/route.ts, templates/[id]/route.ts).
//
// Mounted at /api/admin/proposals (see routes/admin/index.ts).
//
// Fidelity notes:
// - Response shapes match the Next.js routes exactly: document list
//   returns { documents, total, page, pageSize, totalPages }; template
//   list returns { templates, total, page, pageSize, totalPages };
//   get/generate/version return the bare row (generate/version: 201);
//   accept returns { document, projectId, projectCreated }; delete
//   returns { success: true }; versions returns the bare chain array.
// - Documents have NO PUT route in the source (GET + DELETE only).
//   Version creation is POST /documents/:id/version (not GET), and
//   templates update is PUT, matching the sources and the admin UI.
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
// - Template create/update validation mirrors the @repo/validation
//   createProposalTemplateSchema / updateProposalTemplateSchema
//   (zod) field-for-field, including the uuid check on createdBy.
//   @repo/validation is not a dependency of apps/api, so the checks
//   are hand-rolled here (same pattern as content.ts).
// - Drizzle rows are already keyed by the schema's camelCase property
//   names, so no case conversion is applied (the source repos aliased
//   every column to camelCase the same way).
// - These sources have no purgePublicCache / search-indexer calls.
//
// NOT ported: documents/[id]/pdf/route.ts — it uses pdfkit (Node-only:
// Buffer + streams) plus R2 storage via @/lib/pdf, which cannot run
// on Cloudflare Workers. It needs a Workers-compatible PDF path or a
// Node-runtime service; the UI still calls POST /pdf (see the
// proposals [id] page), so this endpoint stays unimplemented until
// that decision is made.
//
// TODO (cutover wiring, deliberately NOT done here): the original
// accept route also dispatchTrigger(..., "proposal_accepted", ...) —
// isolated in a try/catch so a workflow failure never fails the
// acceptance itself. That side effect will be wired at cutover; the
// TODO marker below shows where the call belongs.
import { Hono } from "hono";
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  sql,
} from "drizzle-orm";
import {
  freelanceProjectStatus,
  proposalDocStatus,
  proposalDocuments,
  proposalTemplates,
  proposalType,
  projectsFreelance,
} from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
  };
};

const app = new Hono<Env>();

const TEMPLATE_COLUMNS = getTableColumns(proposalTemplates);

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function parsePage(query: (name: string) => string | undefined): {
  page: number;
  pageSize: number;
} {
  const page = Number(query("page")) || 1;
  const pageSize = Number(query("pageSize")) || 20;
  return { page, pageSize };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

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

async function getDocumentById(
  db: ReturnType<typeof getApiDb>,
  id: string,
) {
  const [row] = await db
    .select()
    .from(proposalDocuments)
    .where(eq(proposalDocuments.id, id))
    .limit(1);
  return row ?? null;
}

async function getTemplateById(
  db: ReturnType<typeof getApiDb>,
  id: string,
) {
  const [row] = await db
    .select()
    .from(proposalTemplates)
    .where(eq(proposalTemplates.id, id))
    .limit(1);
  return row ?? null;
}

// ─── Template validation (mirrors @repo/validation proposals.ts) ─────────────

/**
 * Validates a template body against createProposalTemplateSchema
 * (full) or updateProposalTemplateSchema (partial). Returns the first
 * error message, zod-style, or null when valid. `createdBy` is the
 * session user id for create; for update it is only checked when the
 * body itself carries one.
 */
function validateTemplate(
  body: Record<string, unknown>,
  partial: boolean,
  createdBy?: string,
): string | null {
  const checkString = (
    key: string,
    required: boolean,
  ): string | null => {
    const v = body[key];
    if (v === undefined) return required ? "Required" : null;
    if (typeof v !== "string")
      return `Expected string, received ${typeof v}`;
    return null;
  };
  const checkUuid = (
    key: string,
    required: boolean,
    value?: unknown,
  ): string | null => {
    const v = value !== undefined ? value : body[key];
    if (v === undefined || v === null)
      return required ? "Required" : null;
    if (!isUuid(v)) return "Invalid uuid";
    return null;
  };

  let err: string | null;
  if ((err = checkString("name", !partial))) return err;
  if ((err = checkUuid("projectCategoryId", false))) return err;
  if ((err = checkString("clientType", false))) return err;
  const type = body.type;
  if (type === undefined) {
    if (!partial) return "Required";
  } else if (type !== "proposal" && type !== "contract") {
    return `Invalid enum value. Expected 'proposal' | 'contract', received '${String(type)}'`;
  }
  if ((err = checkString("content", !partial))) return err;
  const variables = body.variables;
  if (variables !== undefined && !isRecord(variables)) {
    return "Expected object, received array";
  }
  const isActive = body.isActive;
  if (isActive === undefined) {
    if (!partial) return "Required";
  } else if (typeof isActive !== "boolean") {
    return `Expected boolean, received ${typeof isActive}`;
  }
  if (createdBy !== undefined) {
    if ((err = checkUuid("createdBy", true, createdBy))) return err;
  } else if ((err = checkUuid("createdBy", false))) {
    return err;
  }
  return null;
}

/** Pick allowlisted template fields from a body (create skips nulls
 *  so DB defaults apply; update sets nulls). */
function templateFields(
  body: Record<string, unknown>,
  skipNulls: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "id" || key === "createdAt" || key === "createdBy") continue;
    if (!(key in TEMPLATE_COLUMNS)) continue;
    if (value === undefined) continue;
    if (value === null && skipNulls) continue;
    out[key] = value;
  }
  return out;
}

// ─── Documents ───────────────────────────────────────────────────────────────

// GET /documents — list (ProposalDocumentRepository.list)
app.get("/documents", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query;
    const clientId = q("clientId");
    const projectId = q("projectId");
    const templateId = q("templateId");
    const statusParam = q("status");
    const latestOnly = q("latestOnly") === "true";
    const { page, pageSize } = parsePage(q);

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
    const body = (await c.req.json()) as Record<string, unknown>;
    const { templateId, projectId, clientId, variables } = body ?? {};

    if (!templateId || typeof templateId !== "string") {
      return c.json({ error: "templateId is required" }, 400);
    }
    if (
      variables !== undefined &&
      (typeof variables !== "object" ||
        variables === null ||
        Array.isArray(variables))
    ) {
      return c.json(
        { error: "variables must be an object of key/value pairs" },
        400,
      );
    }

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
      (variables as Record<string, string>) ?? {},
    );
    const [document] = await db
      .insert(proposalDocuments)
      .values({
        templateId,
        projectId: (projectId as string | null) ?? null,
        clientId: (clientId as string | null) ?? null,
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

// GET /documents/:id — one document.
app.get("/documents/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const document = await getDocumentById(db, c.req.param("id"));
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
    const db = getApiDb();
    const [deleted] = await db
      .delete(proposalDocuments)
      .where(eq(proposalDocuments.id, c.req.param("id")))
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
    const id = c.req.param("id");
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
      // TODO (cutover): dispatchTrigger(dbUrl, "proposal_accepted", id,
      //   { ...document, projectId: document.projectId,
      //     projectCreated: false, triggeredBy: user.id }) — isolated:
      //   a workflow failure must never fail the acceptance itself.
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
    // TODO (cutover): dispatchTrigger(dbUrl, "proposal_accepted", id,
    //   { ...(linked ?? document), projectId: project.id,
    //     projectCreated: true, triggeredBy: user.id }) — isolated, see above.
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
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const reason = body?.reason;
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return c.json({ error: "A rejection reason is required" }, 400);
    }
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
    const id = c.req.param("id");
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
    const id = c.req.param("id");
    const body = (await c.req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const { variables, resolvedContent } = body ?? {};

    if (
      variables !== undefined &&
      (typeof variables !== "object" ||
        variables === null ||
        Array.isArray(variables))
    ) {
      return c.json(
        { error: "variables must be an object of key/value pairs" },
        400,
      );
    }
    if (resolvedContent !== undefined && typeof resolvedContent !== "string") {
      return c.json({ error: "resolvedContent must be a string" }, 400);
    }

    const db = getApiDb();
    const source = await getDocumentById(db, id);
    if (!source) {
      return c.json({ error: `Proposal document not found: ${id}` }, 404);
    }

    let nextResolvedContent: string | null;
    if (resolvedContent !== undefined) {
      nextResolvedContent = resolvedContent as string;
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
          variables as Record<string, string>,
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
    const id = c.req.param("id");
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

// ─── Templates ───────────────────────────────────────────────────────────────

// GET /templates — list (ProposalTemplateRepository.list)
app.get("/templates", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query;
    const type = q("type");
    const clientType = q("clientType");
    const isActiveParam = q("isActive");
    const { page, pageSize } = parsePage(q);

    const conditions: any[] = [];
    if (type) {
      conditions.push(
        eq(
          proposalTemplates.type,
          type as (typeof proposalType.enumValues)[number],
        ),
      );
    }
    if (clientType) {
      conditions.push(eq(proposalTemplates.clientType, clientType));
    }
    if (isActiveParam !== undefined) {
      conditions.push(eq(proposalTemplates.isActive, isActiveParam === "true"));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const db = getApiDb();
    const [countRow] = await db
      .select({ total: count() })
      .from(proposalTemplates)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(proposalTemplates)
      .where(where)
      .orderBy(desc(proposalTemplates.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return c.json({
      templates: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch proposal templates") },
      500,
    );
  }
});

// POST /templates — create (createProposalTemplateSchema-validated).
app.post("/templates", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const validationError = validateTemplate(body, false, user.id);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }
    const db = getApiDb();
    const [template] = await db
      .insert(proposalTemplates)
      .values({
        ...templateFields(body, true),
        createdBy: user.id,
      } as typeof proposalTemplates.$inferInsert)
      .returning();
    if (!template) {
      return c.json({ error: "Failed to create proposal template" }, 500);
    }
    return c.json(template, 201);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to create proposal template") },
      500,
    );
  }
});

// GET /templates/:id — one template.
app.get("/templates/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const template = await getTemplateById(db, c.req.param("id"));
    if (!template) {
      return c.json({ error: "Proposal template not found" }, 404);
    }
    return c.json(template);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to fetch proposal template") },
      500,
    );
  }
});

// PUT /templates/:id — update (updateProposalTemplateSchema-validated).
app.put("/templates/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const validationError = validateTemplate(body, true);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }
    const db = getApiDb();
    const values = templateFields(body, false);
    let template;
    if (Object.keys(values).length === 0) {
      // No updatable fields — the repository returns the existing row.
      template = await getTemplateById(db, id);
    } else {
      [template] = await db
        .update(proposalTemplates)
        .set(values as typeof proposalTemplates.$inferInsert)
        .where(eq(proposalTemplates.id, id))
        .returning();
    }
    if (!template) {
      return c.json({ error: "Proposal template not found" }, 404);
    }
    return c.json(template);
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to update proposal template") },
      500,
    );
  }
});

// DELETE /templates/:id — delete a template.
app.delete("/templates/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [deleted] = await db
      .delete(proposalTemplates)
      .where(eq(proposalTemplates.id, c.req.param("id")))
      .returning({ id: proposalTemplates.id });
    if (!deleted) {
      return c.json({ error: "Proposal template not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to delete proposal template") },
      500,
    );
  }
});

export default app;
