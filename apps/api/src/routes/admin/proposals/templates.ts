// Admin proposal templates — split from routes/admin/proposals.ts
// (move-only refactor, no behavior change). Mounted at
// /api/admin/proposals via proposals/index.ts.
//
// Fidelity notes (from the original file):
// - Template list returns { templates, total, page, pageSize, totalPages };
//   get/create return the bare row (create: 201); delete returns
//   { success: true }.
// - Templates update is PUT, matching the sources and the admin UI.
// - Template create/update validation mirrors the @repo/validation
//   createProposalTemplateSchema / updateProposalTemplateSchema
//   (zod) field-for-field, including the uuid check on createdBy.
//   @repo/validation is not a dependency of apps/api, so the checks
//   are hand-rolled here (same pattern as content.ts).
//   [Note: the original file's later comment records that template
//   validation now uses the real shared schemas
//   (@repo/validation/proposals.ts) — see the local schemas below.]
// - Drizzle rows are already keyed by the schema's camelCase property
//   names, so no case conversion is applied (the source repos aliased
//   every column to camelCase the same way).
// - These sources have no purgePublicCache / search-indexer calls.
import { Hono } from "hono";
import { z } from "zod";
import {
  createProposalTemplateSchema,
  updateProposalTemplateSchema,
  uuidSchema,
} from "@repo/validation";
import { and, count, desc, eq, getTableColumns } from "drizzle-orm";
import { proposalTemplates, proposalType } from "@repo/database/schema";
import { getApiDb } from "../../../db";
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
  getTemplateById,
  isRecord,
  type Env,
} from "./helpers";

const app = new Hono<Env>();

const TEMPLATE_COLUMNS = getTableColumns(proposalTemplates);

// ─── Template validation (mirrors @repo/validation proposals.ts) ─────────────

// Template validation now uses the real shared schemas
// (@repo/validation/proposals.ts), replacing the hand-rolled
// validateTemplate(). Create omits createdBy (stamped from the session)
// and accepts a null projectCategoryId (the old validator did; the
// shared create schema is optional-only, so the null case is extended
// locally). Update omits the server-managed fields.
const createTemplateLocalSchema = createProposalTemplateSchema
  .omit({ createdBy: true })
  .extend({ projectCategoryId: uuidSchema.nullable().optional() });
// NOTE: the shared template schema has no updatedAt column, so it is
// not omitted here (omitting a non-existent key is a type error).
const updateTemplateLocalSchema = updateProposalTemplateSchema.omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

// GET /templates query enum.
const proposalTypeSchema = z.enum(["proposal", "contract"]);

/** Validated data restricted to keys the client actually sent, so a
 *  PUT never writes a field the client omitted. */
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

// ─── Templates ───────────────────────────────────────────────────────────────

// GET /templates — list (ProposalTemplateRepository.list)
app.get("/templates", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query.bind(c.req); // NB: query() reads this.url, so it must stay bound to c.req.
    const type = q("type");
    const clientType = q("clientType");
    const isActiveParam = q("isActive");
    if (type !== undefined && !proposalTypeSchema.safeParse(type).success) {
      return c.json({ error: "Invalid type" }, 400);
    }
    const { page, pageSize } = parsePagination(c);

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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const v = validateBody(body, createTemplateLocalSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    const [template] = await db
      .insert(proposalTemplates)
      .values({
        ...templateFields(v.data, true),
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const template = await getTemplateById(db, id);
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const v = validateBody(body, updateTemplateLocalSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    const values = templateFields(sentFields(v.data, body), false);
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [deleted] = await db
      .delete(proposalTemplates)
      .where(eq(proposalTemplates.id, id))
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
