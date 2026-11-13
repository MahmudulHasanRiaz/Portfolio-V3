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
// PDF: GET /documents/:id/pdf (+ POST alias, see below) — pdf-lib port
// of apps/dashboard/src/app/api/proposals/documents/[id]/pdf/route.ts
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
// routes/admin/workflows.ts does not export its dispatchTrigger and
// @repo/workflows is postgres.js-bound); execution happens via
// /workflows/process or the cron tick. These sources have no
// purgePublicCache / search-indexer calls.
import { Hono, type Context } from "hono";
import {
  PDFDocument,
  PageSizes,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
  type RGB,
} from "pdf-lib";
import { z } from "zod";
import {
  createProposalTemplateSchema,
  updateProposalTemplateSchema,
  uuidSchema,
} from "@repo/validation";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  and,
  asc,
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
  workflowRuns,
  workflows,
} from "@repo/database/schema";
import { getApiDb, type ApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import {
  invalidParam,
  parsePagination,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../lib/validate";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    R2_ENDPOINT?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET?: string;
    R2_PUBLIC_URL?: string;
  };
};

const app = new Hono<Env>();

const TEMPLATE_COLUMNS = getTableColumns(proposalTemplates);

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
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

// ─── Workflow dispatch (TriggerRegistry.dispatch port) ───────────────────────
// See the same helper in routes/admin/finance.ts: @repo/workflows
// dispatchTrigger is postgres.js-bound and routes/admin/workflows.ts
// does not export its Drizzle port, so the two queries are repeated
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

// ─── R2 (S3 SDK directly; mirrors routes/admin/media.ts) ────────────────────

let r2Client: S3Client | null = null;
let r2Bucket = "";

function r2Env(c: Context<Env>): Env["Bindings"] {
  return c.env ?? ({} as Env["Bindings"]);
}

function ensureR2(c: Context<Env>): S3Client {
  if (r2Client) return r2Client;
  const env = r2Env(c);
  const endpoint = env.R2_ENDPOINT ?? process.env.R2_ENDPOINT ?? "";
  const accessKeyId =
    env.R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey =
    env.R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY ?? "";
  const bucket = env.R2_BUCKET ?? process.env.R2_BUCKET ?? "";
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 storage is not configured: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET must be set to store PDFs.",
    );
  }
  r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  r2Bucket = bucket;
  return r2Client;
}

function getR2PublicUrl(c: Context<Env>, key: string): string {
  const env = r2Env(c);
  const publicUrl = env.R2_PUBLIC_URL ?? process.env.R2_PUBLIC_URL ?? "";
  if (publicUrl) {
    return `${publicUrl.replace(/\/+$/, "")}/${key}`;
  }
  return `${r2Bucket}/${key}`;
}

/**
 * Best-effort R2 store for a generated PDF (source: storePdf in
 * apps/dashboard/src/lib/pdf.ts — key documents/<filename>, public URL
 * returned). The source uploaded through a presigned PUT URL because
 * @repo/media exposed no raw upload primitive; here the S3 client puts
 * the object directly — same key, same public URL, one less hop.
 * Returns the public URL, or null (with a warning logged) when storage
 * is unconfigured or the upload fails. Never throws.
 */
async function storePdfBestEffort(
  c: Context<Env>,
  bytes: Uint8Array,
  filename: string,
): Promise<string | null> {
  try {
    const s3 = ensureR2(c);
    const key = `documents/${filename}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        Body: bytes,
        ContentType: "application/pdf",
      }),
    );
    return getR2PublicUrl(c, key);
  } catch (err) {
    console.warn(
      "[PDF] Failed to store PDF in R2:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/** ASCII-safe fallback filename for the Content-Disposition header. */
function safeFilename(name: string): string {
  const base = name
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "file.pdf";
}

function pdfDownloadResponse(
  bytes: Uint8Array,
  filename: string,
): Response {
  const safe = safeFilename(filename);
  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  headers.set("Content-Length", String(bytes.length));
  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers,
  });
}

// ─── PDF rendering (pdf-lib port of apps/dashboard/src/lib/pdf.ts) ───────────
// Same content, same values, same order as generateProposalPdf: the
// template name (or "Proposal") as the title, version / status / sent
// date, the resolved content, the rejection reason when rejected, and
// the "Generated by Portfolio V2" footer. Layout differences from
// pdfkit (unavoidable — pdf-lib has no flow layout, so y positions are
// tracked by hand): Letter page, 50 pt margins (same as the source),
// and line breaks computed from Helvetica metrics, so wrapping points
// can differ by a word. Standard Helvetica only covers WinAnsi:
// characters outside it (notably Bangla script) are replaced with "?"
// — see sanitizePdfText. pdfkit's built-in Helvetica had the same
// limitation, so no content that rendered before is lost.
const [PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT] = PageSizes.Letter;
const PDF_MARGIN = 50;

function sanitizePdfText(text: string): string {
  return text.replace(
    /[^\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u2044\u20AC\u2122\u0192\u02C6\u02DC\u0160\u0161\u017D\u017E\u0152\u0153\u0178]|[\x81\x8D\x8F\x90\x9D\xAD]/g,
    "?",
  );
}

/** Minimal top-down cursor over pdf-lib pages (y = distance from the
 *  top edge, in points). Adds pages as content overflows. Twin of the
 *  PdfWriter in routes/admin/finance.ts. */
class PdfWriter {
  private page: PDFPage;
  private y: number;

  constructor(
    private readonly doc: PDFDocument,
    private readonly font: PDFFont,
    private readonly bold: PDFFont,
  ) {
    this.page = doc.addPage(PageSizes.Letter);
    this.y = PDF_MARGIN;
  }

  private lineHeight(size: number, lineGap = 0): number {
    return size * 1.15 + lineGap;
  }

  private ensureSpace(height: number): void {
    if (this.y + height > PDF_PAGE_HEIGHT - PDF_MARGIN) {
      this.page = this.doc.addPage(PageSizes.Letter);
      this.y = PDF_MARGIN;
    }
  }

  /** Word-wrap sanitized text to the given width, Helvetica metrics. */
  linesFor(
    text: string,
    size: number,
    maxWidth: number,
    bold = false,
  ): string[] {
    const f = bold ? this.bold : this.font;
    const words = sanitizePdfText(text)
      .split(/\s+/)
      .filter(Boolean);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (f.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [""];
  }

  /** Wrapped paragraph at x (default margin), advancing one line per
   *  wrapped line, with a page break when the next line would overflow. */
  para(
    text: string,
    size: number,
    opts?: {
      bold?: boolean;
      color?: RGB;
      x?: number;
      maxWidth?: number;
      lineGap?: number;
    },
  ): void {
    const f = opts?.bold ? this.bold : this.font;
    const x = opts?.x ?? PDF_MARGIN;
    const maxWidth = opts?.maxWidth ?? PDF_PAGE_WIDTH - x - PDF_MARGIN;
    const lh = this.lineHeight(size, opts?.lineGap ?? 0);
    for (const line of this.linesFor(text, size, maxWidth, opts?.bold)) {
      this.ensureSpace(lh);
      this.page.drawText(line, {
        x,
        y: PDF_PAGE_HEIGHT - this.y - size,
        size,
        font: f,
        color: opts?.color,
      });
      this.y += lh;
    }
  }

  moveDown(size: number, n = 1): void {
    this.y += n * this.lineHeight(size);
  }

  save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

type ProposalDocumentRow = typeof proposalDocuments.$inferSelect;

async function generateProposalPdf(
  document: ProposalDocumentRow,
  templateName?: string,
): Promise<Uint8Array> {
  const title = templateName ?? "Proposal";

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new PdfWriter(doc, font, bold);
  const gray = rgb(0.4, 0.4, 0.4);

  w.para(title, 22, { bold: true });
  w.moveDown(22, 0.5);
  w.para(`Version: ${document.version}`, 11);
  w.para(`Status: ${document.status ?? "draft"}`, 11);
  if (document.sentAt) w.para(`Sent: ${document.sentAt}`, 11);
  w.moveDown(11, 1);

  w.para(document.resolvedContent ?? "", 11, { lineGap: 4 });

  if (document.status === "rejected" && document.rejectionReason) {
    w.moveDown(10, 1.5);
    w.para(`Rejection reason: ${document.rejectionReason}`, 10);
  }

  w.moveDown(9, 2);
  w.para("Generated by Portfolio V2 — Personal Brand Platform.", 9, {
    color: gray,
  });

  return w.save();
}

// ─── Proposal PDF endpoint ───────────────────────────────────────────────────
// GET returns the PDF bytes as an attachment (the Hono download form
// the task specifies); POST returns { pdfUrl }, the source's shape,
// which the admin UI expects. Both store the PDF in R2 and update the
// row's pdfUrl, exactly as the source route did.
async function proposalPdf(
  c: Context<Env>,
  download: boolean,
  id: string,
): Promise<Response> {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const document = await getDocumentById(db, id);
    if (!document) {
      return c.json({ error: "Proposal document not found" }, 404);
    }
    const template = document.templateId
      ? await getTemplateById(db, document.templateId)
      : null;
    const bytes = await generateProposalPdf(
      document,
      template?.name ?? undefined,
    );
    const filename = `proposal-${document.id}-v${document.version}.pdf`;
    const pdfUrl = await storePdfBestEffort(c, bytes, filename);
    if (pdfUrl) {
      try {
        await db
          .update(proposalDocuments)
          .set({ pdfUrl })
          .where(eq(proposalDocuments.id, id));
      } catch (err) {
        console.warn(
          "[PDF] Failed to save proposal pdfUrl:",
          err instanceof Error ? err.message : String(err),
        );
      }
    }
    if (download) return pdfDownloadResponse(bytes, filename);
    if (!pdfUrl) {
      return c.json({ error: "Failed to store proposal PDF" }, 500);
    }
    return c.json({ pdfUrl });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to generate proposal PDF") },
      500,
    );
  }
}

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

// GET /documents + GET /templates query enums.
const proposalDocStatusSchema = z.enum([
  "draft",
  "sent",
  "accepted",
  "rejected",
]);
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
