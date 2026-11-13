// Admin finance CRUD — Hono port of the Next.js admin REST routes under
// apps/admin/src/app/api/finance/:
//   expense-categories, expenses, invoices (+ /status), payment-methods,
//   payments, summary.
// Mounted at /finance by the coordinator (see routes/admin/index.ts).
//
// Fidelity notes:
// - Response shapes match the Next.js routes exactly: lists return
//   { <key>, total, page, pageSize, totalPages } (key is expenseCategories /
//   expenses / invoices / paymentMethods / payments); get/create/update
//   return the bare row; delete returns { success: true }. 404 messages
//   ("Expense category not found", "Expense not found", "Invoice not
//   found", "Payment method not found", "Payment not found") are preserved.
// - The sources ran through createFinanceRepositories (@repo/finance,
//   postgres.js over the shared getSql() singleton — TCP, Workers-
//   incompatible). The repository logic is re-implemented here with direct
//   Drizzle over the Neon HTTP db (getApiDb): explicit column handling is
//   unnecessary because Drizzle rows are already keyed by the schema's
//   camelCase property names, so no case conversion is applied.
// - Validation mirrors the @repo/validation finance.ts Zod schemas
//   field-for-field (local copies — apps/api does not depend on
//   @repo/validation). A failed parse returns the first issue's message
//   with 400, exactly as the sources. `createdBy` is never taken from the
//   body: it is stamped from the session user, as in the sources.
// - Money logic mirrors packages/finance/src/currency.ts + the
//   repositories: BDT is the base currency; non-BDT amounts require an
//   exchange rate (400 "Exchange rate is required for ..."), amountBdt /
//   totalBdt are always computed server-side, never trusted from the
//   client. Expenses snapshot the category name into the legacy `category`
//   text column when categoryId is given (unknown categoryId -> 404, as
//   the repository's ExpenseCategoryNotFoundError mapped in the source).
// - Invoices: line items are normalised (quantity defaults to 1, total =
//   round2(quantity * unitPrice)), subtotal/total/totalBdt are computed,
//   invoiceNumber auto-generates as INV-DDMMYY-serial (count of existing
//   numbers with the same prefix + 1, zero-padded to 4) when not provided.
//   PUT recomputes totals exactly as FinanceInvoiceRepository.update does.
// - A duplicate `slug` on expense categories returns 409 with the
//   friendly message, as in the sources.
// - Create skips null values (so DB defaults apply); update sets nulls;
//   a PUT with no updatable fields returns the existing row, as in the
//   repositories. `id` / `createdAt` / `createdBy` are never taken from
//   the body.
//
// PDF: GET /invoices/:id/pdf (+ POST alias, see below) — pdf-lib port of
// apps/dashboard/src/app/api/finance/invoices/[id]/pdf/route.ts via
// apps/dashboard/src/lib/pdf.ts generateInvoicePdf + storePdf. pdfkit
// (Node-only) is NOT used; pdf-lib is pure JS and Workers-safe. The
// generated PDF is stored in R2 under documents/ (direct PutObject,
// where the source uploaded via a presigned PUT URL — same object, same
// public URL) and the row's pdfUrl is updated, exactly as the source.
// GET returns the PDF bytes as an attachment (the Hono download form);
// POST returns { pdfUrl }, the shape the admin UI expects (it POSTs and
// window.open()s the returned URL).
//
// Workflow triggers: POST /invoices/:id/status dispatches
// "invoice_paid" when the status becomes "paid", and POST /payments
// dispatches "payment_received" after a payment is created — both
// isolated in try/catch so a workflow failure never fails the API call,
// exactly as the sources. The dispatch itself only records pending
// workflow_runs rows (the TriggerRegistry.dispatch equivalent,
// re-implemented here with direct Drizzle because
// routes/admin/workflows.ts does not export its dispatchTrigger and
// @repo/workflows is postgres.js-bound); execution happens via
// /workflows/process or the cron tick. Finance routes never purge the
// public cache and never touch the search index in the sources, so there
// is nothing else to wire.
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
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  inArray,
  isNotNull,
  like,
  lte,
  sql,
  sum,
} from "drizzle-orm";
import { z } from "zod";
import {
  expenseCategories,
  expenseSourceType,
  financeExpenses,
  financeInvoices,
  financePayments,
  invoiceStatus,
  paymentMethods,
  paymentSourceType,
  workflowRuns,
  workflows,
} from "@repo/database/schema";
import { getApiDb, type ApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** An error that maps to a non-500 HTTP status (mirrors FinanceError's
 *  code -> status mapping in the Next.js routes: *_NOT_FOUND -> 404,
 *  other finance errors -> 400). */
function fail(status: 400 | 404, message: string): Error {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

function errorResponse(
  c: Context<Env>,
  err: unknown,
  fallback: string,
  duplicateMessage?: string,
): Response {
  if (err instanceof Error) {
    const status = (err as Error & { status?: unknown }).status;
    if (status === 400) return c.json({ error: err.message }, 400);
    if (status === 404) return c.json({ error: err.message }, 404);
    // `slug` is unique: surface a readable message instead of the raw
    // Postgres "duplicate key value violates unique constraint" text.
    if (duplicateMessage && /duplicate key value/i.test(err.message)) {
      return c.json({ error: duplicateMessage }, 409);
    }
  }
  return c.json({ error: errorMessage(err, fallback) }, 500);
}

function parsePage(query: (name: string) => string | undefined): {
  page: number;
  pageSize: number;
} {
  const page = parseInt(query("page") ?? "1", 10);
  const pageSize = parseInt(query("pageSize") ?? "20", 10);
  return {
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
    pageSize:
      Number.isFinite(pageSize) && pageSize >= 1
        ? Math.floor(pageSize)
        : 20,
  };
}

/**
 * Map a request body to table insert/update values. Mirrors the finance
 * repositories' dynamic column handling: only known columns, `id` /
 * `createdAt` / `createdBy` never taken from the body, unknown keys
 * dropped. With skipNulls (create) null values are dropped so DB defaults
 * apply; without it (update) nulls are set, as in the repositories.
 */
function tableFields(
  table: Parameters<typeof getTableColumns>[0],
  body: Record<string, unknown>,
  skipNulls: boolean,
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
    if (value === null && skipNulls) continue;
    out[key] = value;
  }
  return out;
}

/** packages/finance/src/currency.ts — pure, no Node dependency. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function resolveBdtConversion(
  currencyInput: string | null | undefined,
  amount: string | number | null | undefined,
  exchangeRateInput: string | number | null | undefined,
): { currency: string; exchangeRate: number; amountBdt: number } {
  const currency = (currencyInput ?? "BDT").toUpperCase();
  const value = Number(amount ?? 0);
  if (currency === "BDT") {
    return { currency, exchangeRate: 1, amountBdt: round2(value) };
  }
  const rate =
    exchangeRateInput === null ||
    exchangeRateInput === undefined ||
    exchangeRateInput === ""
      ? NaN
      : Number(exchangeRateInput);
  if (!rate || Number.isNaN(rate)) {
    throw fail(
      400,
      `Exchange rate is required for ${currency} transactions (base currency is BDT)`,
    );
  }
  return { currency, exchangeRate: rate, amountBdt: round2(value * rate) };
}

function slugifyCategoryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Invoices: line items + invoice numbers ──────────────────────────────────
// Mirrors packages/finance/src/invoice-repository.ts.

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

function normalizeLineItems(items: unknown): InvoiceLineItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const quantity = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
    return {
      description:
        typeof item.description === "string" ? item.description : "",
      quantity,
      unitPrice,
      total: round2(quantity * unitPrice),
    };
  });
}

function parseLineItems(value: unknown): InvoiceLineItem[] {
  let v: unknown = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  return normalizeLineItems(v);
}

type InvoiceRow = typeof financeInvoices.$inferSelect;

function withParsedLineItems(row: InvoiceRow): InvoiceRow {
  return { ...row, lineItems: parseLineItems(row.lineItems) };
}

function invoiceDatePrefix(issuedDate: string | null | undefined): string {
  let year: number;
  let month: number;
  let day: number;
  if (issuedDate) {
    // issued_date is a plain date (YYYY-MM-DD); parse parts directly to
    // avoid timezone shifts from Date parsing.
    const parts = issuedDate.split("-").map((part) => Number(part));
    year = parts[0] ?? 0;
    month = parts[1] ?? 0;
    day = parts[2] ?? 0;
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
    day = now.getDate();
  }
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const yy = String(year).slice(-2).padStart(2, "0");
  return `${dd}${mm}${yy}`;
}

async function generateInvoiceNumber(
  db: ApiDb,
  issuedDate?: string | null,
): Promise<string> {
  const prefix = `INV-${invoiceDatePrefix(issuedDate)}-`;
  const [row] = await db
    .select({ total: count() })
    .from(financeInvoices)
    .where(like(financeInvoices.invoiceNumber, `${prefix}%`));
  const serial = Number(row?.total ?? 0) + 1;
  return `${prefix}${String(serial).padStart(4, "0")}`;
}

// ─── Workflow dispatch (TriggerRegistry.dispatch port) ───────────────────────
// @repo/workflows dispatchTrigger is NOT Workers-safe (postgres.js pool)
// and routes/admin/workflows.ts does not export its Drizzle port of the
// same function, so the two queries are repeated here: find the active
// workflows listening for the trigger, then record one pending
// workflow_runs row per match. Dispatch only records runs — execution
// happens via POST /workflows/process or the cron tick. Callers wrap
// this in try/catch so a workflow failure never fails the API call.
// The payload is JSON round-tripped first so Drizzle row values that
// are not plain JSON (Date objects, numeric strings stay strings) are
// stored exactly as the jsonb column would hold them.
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
// Env is read from c.env first, then process.env (the same fallback
// db.ts uses for DATABASE_URL). The client is a lazy module-level
// singleton, mirroring packages/media/src/r2.ts.

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
 * is unconfigured or the upload fails. Never throws: the GET download
 * still returns the PDF bytes, and the POST route turns a null into the
 * 500 the source would have returned.
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
// pdfkit is Node-only (Buffer/streams); pdf-lib is pure JS and runs on
// Workers. Same content, same values, same order as generateInvoicePdf:
// "INVOICE" title, invoice number / billed-to / issued / due / status,
// the line-items table (Description / Qty / Unit Price / Total),
// subtotal / discount (only when non-zero) / total, the non-BDT
// "Total in BDT" line with exchange rate, notes, and the "Generated by
// Portfolio V2" footer. Layout differences from pdfkit (unavoidable —
// pdf-lib has no flow layout, so y positions are tracked by hand):
//   - Letter page, 50 pt margins (same as the source).
//   - Line breaks are computed from Helvetica metrics, so wrapping
//     points can differ by a word from pdfkit's.
//   - A table row grows past 16 pt when its description wraps (the
//     source fixed every row at 16 pt, so a long description could
//     overlap the next row there).
//   - The totals value column is left-aligned at x=400, as in the
//     source (pdfkit drew it there with an explicit x).
//   - Standard Helvetica only covers WinAnsi: characters outside it
//     (notably Bangla script) are replaced with "?" — see
//     sanitizePdfText. pdfkit's built-in Helvetica had the same
//     limitation, so no content that rendered before is lost.
const [PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT] = PageSizes.Letter;
const PDF_MARGIN = 50;

/**
 * Characters the embedded Standard Helvetica (WinAnsi) cannot encode
 * become "?" instead of throwing inside pdf-lib's encoder and failing
 * the whole request. Kept: printable ASCII, Latin-1, and the WinAnsi
 * punctuation (en/em dash, curly quotes, bullet, ellipsis, euro,
 * trademark, …). Everything else — including Bangla — is replaced.
 * GAP: a Bangla invoice (notes / descriptions in Bangla) renders its
 * Bangla runs as "?" — a Bangla-capable embedded font would be needed
 * to render them, and the source had no such font either.
 */
function sanitizePdfText(text: string): string {
  return text.replace(
    /[^\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u2044\u20AC\u2122\u0192\u02C6\u02DC\u0160\u0161\u017D\u017E\u0152\u0153\u0178]|[\x81\x8D\x8F\x90\x9D\xAD]/g,
    "?",
  );
}

/** Minimal top-down cursor over pdf-lib pages (y = distance from the
 *  top edge, in points). Adds pages as content overflows. */
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

  /** One unwrapped line at an absolute x on the current row (no y
   *  advance — the caller advances). `dy` offsets down within the row. */
  drawAt(
    text: string,
    x: number,
    size: number,
    opts?: { bold?: boolean; color?: RGB; dy?: number },
  ): void {
    const f = opts?.bold ? this.bold : this.font;
    this.page.drawText(sanitizePdfText(text), {
      x,
      y: PDF_PAGE_HEIGHT - this.y - (opts?.dy ?? 0) - size,
      size,
      font: f,
      color: opts?.color,
    });
  }

  /** Horizontal rule across the current row (no y advance). */
  rule(x1: number, x2: number): void {
    this.page.drawLine({
      start: { x: x1, y: PDF_PAGE_HEIGHT - this.y },
      end: { x: x2, y: PDF_PAGE_HEIGHT - this.y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
  }

  advance(points: number): void {
    this.y += points;
  }

  moveDown(size: number, n = 1): void {
    this.y += n * this.lineHeight(size);
  }

  newLine(size: number, lineGap = 0): void {
    this.y += this.lineHeight(size, lineGap);
  }

  ensureSpaceFor(height: number): void {
    this.ensureSpace(height);
  }

  save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

function money(value: string | number | null | undefined): string {
  const num = Number(value ?? 0);
  return Number.isNaN(num) ? "0.00" : num.toFixed(2);
}

async function generateInvoicePdf(
  invoice: InvoiceRow,
  clientName?: string,
): Promise<Uint8Array> {
  const currency = invoice.currency ?? "BDT";
  const items = parseLineItems(invoice.lineItems);

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new PdfWriter(doc, font, bold);
  const gray = rgb(0.4, 0.4, 0.4);

  w.para("INVOICE", 24, { bold: true });
  w.moveDown(24, 0.5);
  w.para(`Invoice Number: ${invoice.invoiceNumber ?? invoice.id}`, 11);
  if (clientName) w.para(`Billed To: ${clientName}`, 11);
  else if (invoice.clientId) w.para(`Client ID: ${invoice.clientId}`, 11);
  if (invoice.issuedDate) w.para(`Issued: ${invoice.issuedDate}`, 11);
  if (invoice.dueDate) w.para(`Due: ${invoice.dueDate}`, 11);
  w.para(`Status: ${invoice.status ?? "draft"}`, 11);
  w.moveDown(11, 1);

  // Line items table (source x positions, row width 50–562).
  const startX = 50;
  const qtyX = 340;
  const priceX = 400;
  const totalX = 480;
  const rowEndX = 562;
  w.drawAt("Description", startX, 10, { bold: true });
  w.drawAt("Qty", qtyX, 10, { bold: true });
  w.drawAt("Unit Price", priceX, 10, { bold: true });
  w.drawAt("Total", totalX, 10, { bold: true });
  w.advance(16);
  w.rule(startX, rowEndX);
  w.advance(6);

  for (const item of items) {
    const descLines = w.linesFor(
      item.description || "-",
      10,
      qtyX - startX - 10,
    );
    const rowHeight = Math.max(16, descLines.length * 12);
    w.ensureSpaceFor(rowHeight);
    descLines.forEach((line, i) =>
      w.drawAt(line, startX, 10, { dy: i * 12 }),
    );
    w.drawAt(String(item.quantity), qtyX, 10);
    w.drawAt(money(item.unitPrice), priceX, 10);
    w.drawAt(money(item.total), totalX, 10);
    w.advance(rowHeight);
  }

  w.advance(4);
  w.rule(startX, rowEndX);
  w.moveDown(11, 1);

  const labelX = 380;
  w.drawAt("Subtotal:", labelX, 11);
  w.drawAt(`${money(invoice.subtotal)} ${currency}`, totalX - 80, 11);
  w.newLine(11);
  if (Number(invoice.discount ?? 0) !== 0) {
    w.drawAt("Discount:", labelX, 11);
    w.drawAt(`${money(invoice.discount)} ${currency}`, totalX - 80, 11);
    w.newLine(11);
  }
  w.drawAt("Total:", labelX, 11, { bold: true });
  w.drawAt(`${money(invoice.total)} ${currency}`, totalX - 80, 11, {
    bold: true,
  });
  w.newLine(11);

  if (currency !== "BDT" && invoice.totalBdt) {
    w.moveDown(11, 0.5);
    w.para(
      `Total in BDT: ${money(invoice.totalBdt)} BDT` +
        (invoice.exchangeRate
          ? ` (exchange rate: ${invoice.exchangeRate})`
          : ""),
      11,
      { x: labelX },
    );
  }

  if (invoice.notes) {
    w.moveDown(10, 1.5);
    w.para(`Notes: ${invoice.notes}`, 10);
  }

  w.moveDown(9, 2);
  w.para("Generated by Portfolio V2 — Personal Brand Platform.", 9, {
    color: gray,
  });

  return w.save();
}

// ─── Invoice PDF endpoint ────────────────────────────────────────────────────
// GET returns the PDF bytes as an attachment (the Hono download form
// the task specifies); POST returns { pdfUrl }, the source's shape,
// which the admin UI expects. Both store the PDF in R2 and update the
// row's pdfUrl, exactly as the source route did. The source called
// generateInvoicePdf(invoice) with no client name, so the "Billed To"
// line is the client id, as in the source.
async function invoicePdf(
  c: Context<Env>,
  download: boolean,
  id: string,
): Promise<Response> {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(financeInvoices)
      .where(eq(financeInvoices.id, id))
      .limit(1);
    if (!row) return c.json({ error: "Invoice not found" }, 404);
    const invoice = withParsedLineItems(row);
    const bytes = await generateInvoicePdf(invoice);
    const filename = `invoice-${invoice.invoiceNumber ?? invoice.id}.pdf`;
    const pdfUrl = await storePdfBestEffort(c, bytes, filename);
    if (pdfUrl) {
      try {
        await db
          .update(financeInvoices)
          .set({ pdfUrl })
          .where(eq(financeInvoices.id, invoice.id));
      } catch (err) {
        console.warn(
          "[PDF] Failed to save invoice pdfUrl:",
          err instanceof Error ? err.message : String(err),
        );
      }
    }
    if (download) return pdfDownloadResponse(bytes, filename);
    if (!pdfUrl) {
      return c.json({ error: "Failed to store invoice PDF" }, 500);
    }
    return c.json({ pdfUrl });
  } catch (err) {
    return errorResponse(c, err, "Failed to generate invoice PDF");
  }
}

// ─── Expenses: category snapshot ─────────────────────────────────────────────

async function resolveCategoryName(
  db: ApiDb,
  categoryId: string,
): Promise<string> {
  const [row] = await db
    .select({ name: expenseCategories.name })
    .from(expenseCategories)
    .where(eq(expenseCategories.id, categoryId))
    .limit(1);
  if (!row) throw fail(404, `Expense category not found: ${categoryId}`);
  return row.name ?? "";
}

// ─── Validation ──────────────────────────────────────────────────────────────
// Local copies of the @repo/validation finance.ts schemas (apps/api does
// not depend on @repo/validation). Create schemas omit `createdBy` — it is
// stamped from the session, never taken from the body.

const uuidSchema = z.string().uuid();
const slugSchema = z.string().min(1).max(255).regex(/^[a-z0-9-]+$/);
const timestampSchema = z.string().datetime();
const paymentMethodTypeSchema = z.enum([
  "mobile_banking",
  "bank",
  "cash",
  "international",
]);
const expenseSourceTypeSchema = z.enum([
  "freelance_project",
  "artist_event",
  "general",
]);
const paymentSourceTypeSchema = z.enum([
  "freelance_project",
  "artist_event",
]);
const paymentTypeSchema = z.enum([
  "advance",
  "installment",
  "final",
  "full",
]);
const invoiceStatusSchema = z.enum(["draft", "sent", "paid", "cancelled"]);

const expenseCategorySchema = z.object({
  id: uuidSchema,
  name: z.string().max(100),
  slug: slugSchema,
  description: z.string().optional(),
  color: z.string().max(7).optional(),
  icon: z.string().optional(),
  isActive: z.boolean(),
  createdAt: timestampSchema,
});
const createExpenseCategorySchema = z.object({
  name: z.string().max(100),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  color: z.string().max(7).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});
const updateExpenseCategorySchema = expenseCategorySchema.partial();

const paymentMethodSchema = z.object({
  id: uuidSchema,
  name: z.string().max(100),
  type: paymentMethodTypeSchema,
  isActive: z.boolean(),
  createdAt: timestampSchema,
});
const createPaymentMethodSchema = z.object({
  name: z.string().max(100),
  type: paymentMethodTypeSchema,
  isActive: z.boolean(),
});
const updatePaymentMethodSchema = paymentMethodSchema.partial();

const financePaymentSchema = z.object({
  id: uuidSchema,
  sourceType: paymentSourceTypeSchema,
  sourceId: uuidSchema,
  clientId: uuidSchema,
  amount: z.coerce.number(),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  amountBdt: z.coerce.number().optional(),
  paymentMethodId: uuidSchema,
  paymentDate: z.string(),
  paymentType: paymentTypeSchema,
  notes: z.string().optional(),
  invoiceId: uuidSchema.optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});
const createFinancePaymentSchema = z.object({
  sourceType: paymentSourceTypeSchema,
  sourceId: uuidSchema,
  clientId: uuidSchema,
  amount: z.coerce.number(),
  currency: z.string().max(10),
  // Required by the repository when currency is not BDT (base currency);
  // amountBdt is always computed by the repository, never sent by clients.
  exchangeRate: z.coerce.number().optional(),
  paymentMethodId: uuidSchema,
  paymentDate: z.string(),
  paymentType: paymentTypeSchema,
  notes: z.string().optional(),
  invoiceId: uuidSchema.optional(),
});
const updateFinancePaymentSchema = financePaymentSchema.partial();

const financeExpenseSchema = z.object({
  id: uuidSchema,
  sourceType: expenseSourceTypeSchema,
  sourceId: uuidSchema.optional(),
  category: z.string().optional(),
  categoryId: uuidSchema.optional(),
  description: z.string(),
  amount: z.coerce.number(),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  amountBdt: z.coerce.number().optional(),
  paymentMethodId: uuidSchema,
  expenseDate: z.string(),
  receiptUrl: z.string().optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});
const createFinanceExpenseSchema = z.object({
  sourceType: expenseSourceTypeSchema,
  sourceId: uuidSchema.optional(),
  // Optional: when categoryId is given the repository snapshots the
  // category name into `category`; amountBdt is computed by the repository.
  category: z.string().optional(),
  categoryId: uuidSchema.optional(),
  description: z.string(),
  amount: z.coerce.number(),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  paymentMethodId: uuidSchema,
  expenseDate: z.string(),
  receiptUrl: z.string().optional(),
});
const updateFinanceExpenseSchema = financeExpenseSchema.partial();

const invoiceLineItemSchema = z.object({
  description: z.string(),
  quantity: z.coerce.number(),
  unitPrice: z.coerce.number(),
  // Computed by the repository from quantity * unitPrice when creating.
  total: z.coerce.number().optional(),
});
const financeInvoiceSchema = z.object({
  id: uuidSchema,
  invoiceNumber: z.string().max(50),
  sourceType: paymentSourceTypeSchema,
  sourceId: uuidSchema,
  clientId: uuidSchema,
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.coerce.number(),
      unitPrice: z.coerce.number(),
      total: z.coerce.number(),
    }),
  ),
  subtotal: z.coerce.number(),
  discount: z.coerce.number().optional(),
  total: z.coerce.number(),
  totalBdt: z.coerce.number().optional(),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  status: invoiceStatusSchema,
  issuedDate: z.string(),
  dueDate: z.string(),
  notes: z.string().optional(),
  pdfUrl: z.string().optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});
const createFinanceInvoiceSchema = z.object({
  // invoiceNumber is auto-generated by the repository (INV-DDMMYY-serial)
  // when not provided; subtotal/total/totalBdt are always computed there.
  invoiceNumber: z.string().max(50).optional(),
  sourceType: paymentSourceTypeSchema,
  sourceId: uuidSchema,
  clientId: uuidSchema,
  lineItems: z.array(invoiceLineItemSchema),
  discount: z.coerce.number().optional(),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  status: invoiceStatusSchema.optional(),
  issuedDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  pdfUrl: z.string().optional(),
});
const updateFinanceInvoiceSchema = financeInvoiceSchema.partial();

/** First Zod issue message, exactly as the Next.js routes return it. */
function invalidBody(parsed: { error: z.ZodError }): string {
  return parsed.error.issues[0]?.message ?? "Invalid request body";
}

// ─── Expense categories ──────────────────────────────────────────────────────

const CATEGORY_DUPLICATE_MESSAGE =
  "A category with this slug already exists. Choose a different slug.";

app.get("/expense-categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const onlyActive = c.req.query("onlyActive") === "true";
    const { page, pageSize } = parsePage((name) => c.req.query(name));
    const db = getApiDb();
    const where = onlyActive
      ? eq(expenseCategories.isActive, true)
      : undefined;
    const [countRow] = await db
      .select({ total: count() })
      .from(expenseCategories)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(expenseCategories)
      .where(where)
      .orderBy(asc(expenseCategories.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({
      expenseCategories: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch expense categories");
  }
});

app.post("/expense-categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = createExpenseCategorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const data = tableFields(expenseCategories, parsed.data, true);
    if (!data.slug && typeof data.name === "string") {
      data.slug = slugifyCategoryName(data.name);
    }
    const [row] = await db
      .insert(expenseCategories)
      .values(data as typeof expenseCategories.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create" }, 500);
    return c.json(row, 201);
  } catch (err) {
    return errorResponse(
      c,
      err,
      "Failed to create",
      CATEGORY_DUPLICATE_MESSAGE,
    );
  }
});

app.get("/expense-categories/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.id, c.req.param("id")))
      .limit(1);
    if (!row) {
      return c.json({ error: "Expense category not found" }, 404);
    }
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch");
  }
});

app.put("/expense-categories/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = updateExpenseCategorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const [existing] = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.id, id))
      .limit(1);
    if (!existing) {
      return c.json({ error: "Expense category not found" }, 404);
    }
    const fields = tableFields(expenseCategories, parsed.data, false);
    if (Object.keys(fields).length === 0) return c.json(existing);
    const [row] = await db
      .update(expenseCategories)
      .set(fields as typeof expenseCategories.$inferInsert)
      .where(eq(expenseCategories.id, id))
      .returning();
    if (!row) {
      return c.json({ error: "Expense category not found" }, 404);
    }
    return c.json(row);
  } catch (err) {
    return errorResponse(
      c,
      err,
      "Failed to update",
      CATEGORY_DUPLICATE_MESSAGE,
    );
  }
});

app.delete("/expense-categories/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const deleted = await db
      .delete(expenseCategories)
      .where(eq(expenseCategories.id, c.req.param("id")))
      .returning({ id: expenseCategories.id });
    if (deleted.length === 0) {
      return c.json({ error: "Expense category not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});

// ─── Expenses ────────────────────────────────────────────────────────────────

app.get("/expenses", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query;
    const sourceType = q("sourceType") ?? undefined;
    const sourceId = q("sourceId") ?? undefined;
    const categoryId = q("categoryId") ?? undefined;
    const dateFrom = q("dateFrom") ?? undefined;
    const dateTo = q("dateTo") ?? undefined;
    const { page, pageSize } = parsePage((name) => c.req.query(name));
    const db = getApiDb();
    const where = and(
      sourceType
        ? eq(
            financeExpenses.sourceType,
            sourceType as (typeof expenseSourceType.enumValues)[number],
          )
        : undefined,
      sourceId ? eq(financeExpenses.sourceId, sourceId) : undefined,
      categoryId ? eq(financeExpenses.categoryId, categoryId) : undefined,
      dateFrom ? gte(financeExpenses.expenseDate, dateFrom) : undefined,
      dateTo ? lte(financeExpenses.expenseDate, dateTo) : undefined,
    );
    const [countRow] = await db
      .select({ total: count() })
      .from(financeExpenses)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(financeExpenses)
      .where(where)
      .orderBy(
        sql`${financeExpenses.expenseDate} DESC NULLS LAST`,
        desc(financeExpenses.createdAt),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({
      expenses: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch expenses");
  }
});

app.post("/expenses", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = createFinanceExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const conversion = resolveBdtConversion(
      parsed.data.currency,
      parsed.data.amount,
      parsed.data.exchangeRate,
    );
    const db = getApiDb();
    // Snapshot the category name into the legacy `category` text column.
    let category: string | undefined;
    if (parsed.data.categoryId) {
      category = await resolveCategoryName(db, parsed.data.categoryId);
    }
    const data = tableFields(financeExpenses, parsed.data, true);
    data.currency = conversion.currency;
    data.exchangeRate = conversion.exchangeRate;
    data.amountBdt = conversion.amountBdt;
    if (category !== undefined) data.category = category;
    const [row] = await db
      .insert(financeExpenses)
      .values({
        ...data,
        createdBy: user.id,
      } as typeof financeExpenses.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create" }, 500);
    return c.json(row, 201);
  } catch (err) {
    return errorResponse(c, err, "Failed to create");
  }
});

app.get("/expenses/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(financeExpenses)
      .where(eq(financeExpenses.id, c.req.param("id")))
      .limit(1);
    if (!row) return c.json({ error: "Expense not found" }, 404);
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch");
  }
});

app.put("/expenses/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = updateFinanceExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const [existing] = await db
      .select()
      .from(financeExpenses)
      .where(eq(financeExpenses.id, id))
      .limit(1);
    if (!existing) return c.json({ error: "Expense not found" }, 404);
    // Snapshot the category name when categoryId changes.
    let category: string | undefined;
    if (
      typeof parsed.data.categoryId === "string" &&
      parsed.data.categoryId
    ) {
      category = await resolveCategoryName(db, parsed.data.categoryId);
    }
    const fields = tableFields(financeExpenses, parsed.data, false);
    if (category !== undefined) fields.category = category;
    // Keep amount_bdt consistent whenever amount, currency or rate changes.
    if (
      parsed.data.amount !== undefined ||
      parsed.data.currency !== undefined ||
      parsed.data.exchangeRate !== undefined
    ) {
      const conversion = resolveBdtConversion(
        parsed.data.currency ?? existing.currency,
        parsed.data.amount ?? existing.amount,
        parsed.data.exchangeRate ?? existing.exchangeRate,
      );
      fields.currency = conversion.currency;
      fields.exchangeRate = conversion.exchangeRate;
      fields.amountBdt = conversion.amountBdt;
    }
    if (Object.keys(fields).length === 0) return c.json(existing);
    const [row] = await db
      .update(financeExpenses)
      .set(fields as typeof financeExpenses.$inferInsert)
      .where(eq(financeExpenses.id, id))
      .returning();
    if (!row) return c.json({ error: "Expense not found" }, 404);
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to update");
  }
});

app.delete("/expenses/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const deleted = await db
      .delete(financeExpenses)
      .where(eq(financeExpenses.id, c.req.param("id")))
      .returning({ id: financeExpenses.id });
    if (deleted.length === 0) {
      return c.json({ error: "Expense not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});

// ─── Invoices ────────────────────────────────────────────────────────────────

app.get("/invoices", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query;
    const statusParam = q("status") ?? undefined;
    const statuses = statusParam
      ? statusParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    const sourceType = q("sourceType") ?? undefined;
    const sourceId = q("sourceId") ?? undefined;
    const clientId = q("clientId") ?? undefined;
    const { page, pageSize } = parsePage((name) => c.req.query(name));
    const db = getApiDb();
    const where = and(
      statuses && statuses.length > 0
        ? inArray(
            financeInvoices.status,
            statuses as (typeof invoiceStatus.enumValues)[number][],
          )
        : undefined,
      sourceType
        ? eq(
            financeInvoices.sourceType,
            sourceType as (typeof paymentSourceType.enumValues)[number],
          )
        : undefined,
      sourceId ? eq(financeInvoices.sourceId, sourceId) : undefined,
      clientId ? eq(financeInvoices.clientId, clientId) : undefined,
    );
    const [countRow] = await db
      .select({ total: count() })
      .from(financeInvoices)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(financeInvoices)
      .where(where)
      .orderBy(
        sql`${financeInvoices.issuedDate} DESC NULLS LAST`,
        desc(financeInvoices.createdAt),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({
      invoices: rows.map(withParsedLineItems),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch invoices");
  }
});

app.post("/invoices", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = createFinanceInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const lineItems = normalizeLineItems(parsed.data.lineItems);
    const subtotal = round2(
      lineItems.reduce((sum, item) => sum + item.total, 0),
    );
    const discount =
      parsed.data.discount === undefined
        ? 0
        : Number(parsed.data.discount);
    const total = round2(subtotal - discount);
    const conversion = resolveBdtConversion(
      parsed.data.currency,
      total,
      parsed.data.exchangeRate,
    );
    const db = getApiDb();
    const invoiceNumber =
      typeof parsed.data.invoiceNumber === "string" &&
      parsed.data.invoiceNumber
        ? parsed.data.invoiceNumber
        : await generateInvoiceNumber(db, parsed.data.issuedDate);
    const data = tableFields(financeInvoices, parsed.data, true);
    data.invoiceNumber = invoiceNumber;
    data.lineItems = lineItems;
    data.subtotal = subtotal;
    data.discount = discount;
    data.total = total;
    data.currency = conversion.currency;
    data.exchangeRate = conversion.exchangeRate;
    data.totalBdt = conversion.amountBdt;
    const [row] = await db
      .insert(financeInvoices)
      .values({
        ...data,
        createdBy: user.id,
      } as typeof financeInvoices.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create" }, 500);
    return c.json(withParsedLineItems(row), 201);
  } catch (err) {
    return errorResponse(c, err, "Failed to create");
  }
});

// GET /invoices/:id/pdf — PDF download; POST — source shape { pdfUrl }.
// Registered BEFORE /invoices/:id so the static "pdf" segment wins.
app.get("/invoices/:id/pdf", (c) => invoicePdf(c, true, c.req.param("id")));
app.post("/invoices/:id/pdf", (c) =>
  invoicePdf(c, false, c.req.param("id")),
);

app.get("/invoices/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(financeInvoices)
      .where(eq(financeInvoices.id, c.req.param("id")))
      .limit(1);
    if (!row) return c.json({ error: "Invoice not found" }, 404);
    return c.json(withParsedLineItems(row));
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch");
  }
});

app.put("/invoices/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = updateFinanceInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const [existingRow] = await db
      .select()
      .from(financeInvoices)
      .where(eq(financeInvoices.id, id))
      .limit(1);
    if (!existingRow) return c.json({ error: "Invoice not found" }, 404);
    const existing = withParsedLineItems(existingRow);
    const fields = tableFields(financeInvoices, parsed.data, false);
    let totalsChanged = false;
    if (parsed.data.lineItems !== undefined) {
      const lineItems = normalizeLineItems(parsed.data.lineItems);
      const subtotal = round2(
        lineItems.reduce((sum, item) => sum + item.total, 0),
      );
      const discount =
        parsed.data.discount === undefined
          ? Number(existing.discount ?? 0)
          : Number(parsed.data.discount ?? 0);
      fields.lineItems = lineItems;
      fields.subtotal = subtotal;
      fields.discount = discount;
      fields.total = round2(subtotal - discount);
      totalsChanged = true;
    } else if (
      parsed.data.discount !== undefined &&
      existing.subtotal !== null
    ) {
      const discount = Number(parsed.data.discount ?? 0);
      fields.total = round2(Number(existing.subtotal) - discount);
      totalsChanged = true;
    }
    // Keep total_bdt consistent whenever money fields change.
    if (
      totalsChanged ||
      parsed.data.currency !== undefined ||
      parsed.data.exchangeRate !== undefined
    ) {
      const effectiveTotal =
        fields.total !== undefined
          ? Number(fields.total)
          : Number(existing.total ?? 0);
      const conversion = resolveBdtConversion(
        parsed.data.currency ?? existing.currency,
        effectiveTotal,
        parsed.data.exchangeRate ?? existing.exchangeRate,
      );
      fields.currency = conversion.currency;
      fields.exchangeRate = conversion.exchangeRate;
      fields.totalBdt = conversion.amountBdt;
    }
    if (Object.keys(fields).length === 0) return c.json(existing);
    const [row] = await db
      .update(financeInvoices)
      .set(fields as typeof financeInvoices.$inferInsert)
      .where(eq(financeInvoices.id, id))
      .returning();
    if (!row) return c.json({ error: "Invoice not found" }, 404);
    return c.json(withParsedLineItems(row));
  } catch (err) {
    return errorResponse(c, err, "Failed to update");
  }
});

app.delete("/invoices/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const deleted = await db
      .delete(financeInvoices)
      .where(eq(financeInvoices.id, c.req.param("id")))
      .returning({ id: financeInvoices.id });
    if (deleted.length === 0) {
      return c.json({ error: "Invoice not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});

// POST (not PATCH) — matches the Next.js source exactly.
app.post("/invoices/:id/status", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = invoiceStatusSchema.safeParse(body?.status);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const [row] = await db
      .update(financeInvoices)
      .set({ status: parsed.data })
      .where(eq(financeInvoices.id, id))
      .returning();
    if (!row) return c.json({ error: "Invoice not found" }, 404);
    const invoice = withParsedLineItems(row);
    if (parsed.data === "paid") {
      // Workflow dispatch is isolated: a workflow failure must never fail
      // the status change itself.
      try {
        await dispatchWorkflowTrigger(db, "invoice_paid", invoice.id, {
          ...invoice,
          triggeredBy: user.id,
        });
      } catch (err) {
        console.error(
          "[Invoices API] Failed to dispatch invoice_paid:",
          err,
        );
      }
    }
    return c.json(invoice);
  } catch (err) {
    return errorResponse(c, err, "Failed to update invoice status");
  }
});

// ─── Payment methods ─────────────────────────────────────────────────────────

app.get("/payment-methods", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const onlyActive = c.req.query("onlyActive") === "true";
    const { page, pageSize } = parsePage((name) => c.req.query(name));
    const db = getApiDb();
    const where = onlyActive ? eq(paymentMethods.isActive, true) : undefined;
    const [countRow] = await db
      .select({ total: count() })
      .from(paymentMethods)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(paymentMethods)
      .where(where)
      .orderBy(desc(paymentMethods.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({
      paymentMethods: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch payment methods");
  }
});

app.post("/payment-methods", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = createPaymentMethodSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const data = tableFields(paymentMethods, parsed.data, true);
    const [row] = await db
      .insert(paymentMethods)
      .values(data as typeof paymentMethods.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create" }, 500);
    return c.json(row, 201);
  } catch (err) {
    return errorResponse(c, err, "Failed to create");
  }
});

app.get("/payment-methods/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, c.req.param("id")))
      .limit(1);
    if (!row) {
      return c.json({ error: "Payment method not found" }, 404);
    }
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch");
  }
});

app.put("/payment-methods/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = updatePaymentMethodSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const [existing] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .limit(1);
    if (!existing) {
      return c.json({ error: "Payment method not found" }, 404);
    }
    const fields = tableFields(paymentMethods, parsed.data, false);
    if (Object.keys(fields).length === 0) return c.json(existing);
    const [row] = await db
      .update(paymentMethods)
      .set(fields as typeof paymentMethods.$inferInsert)
      .where(eq(paymentMethods.id, id))
      .returning();
    if (!row) {
      return c.json({ error: "Payment method not found" }, 404);
    }
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to update");
  }
});

app.delete("/payment-methods/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const deleted = await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, c.req.param("id")))
      .returning({ id: paymentMethods.id });
    if (deleted.length === 0) {
      return c.json({ error: "Payment method not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});

// ─── Payments ────────────────────────────────────────────────────────────────

app.get("/payments", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query;
    const sourceType = q("sourceType") ?? undefined;
    const sourceId = q("sourceId") ?? undefined;
    const clientId = q("clientId") ?? undefined;
    const invoiceId = q("invoiceId") ?? undefined;
    const paymentMethodId = q("paymentMethodId") ?? undefined;
    const dateFrom = q("dateFrom") ?? undefined;
    const dateTo = q("dateTo") ?? undefined;
    const { page, pageSize } = parsePage((name) => c.req.query(name));
    const db = getApiDb();
    const where = and(
      sourceType
        ? eq(
            financePayments.sourceType,
            sourceType as (typeof paymentSourceType.enumValues)[number],
          )
        : undefined,
      sourceId ? eq(financePayments.sourceId, sourceId) : undefined,
      clientId ? eq(financePayments.clientId, clientId) : undefined,
      invoiceId ? eq(financePayments.invoiceId, invoiceId) : undefined,
      paymentMethodId
        ? eq(financePayments.paymentMethodId, paymentMethodId)
        : undefined,
      dateFrom ? gte(financePayments.paymentDate, dateFrom) : undefined,
      dateTo ? lte(financePayments.paymentDate, dateTo) : undefined,
    );
    const [countRow] = await db
      .select({ total: count() })
      .from(financePayments)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(financePayments)
      .where(where)
      .orderBy(
        sql`${financePayments.paymentDate} DESC NULLS LAST`,
        desc(financePayments.createdAt),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({
      payments: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch payments");
  }
});

app.post("/payments", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = createFinancePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const conversion = resolveBdtConversion(
      parsed.data.currency,
      parsed.data.amount,
      parsed.data.exchangeRate,
    );
    const db = getApiDb();
    const data = tableFields(financePayments, parsed.data, true);
    data.currency = conversion.currency;
    data.exchangeRate = conversion.exchangeRate;
    data.amountBdt = conversion.amountBdt;
    const [row] = await db
      .insert(financePayments)
      .values({
        ...data,
        createdBy: user.id,
      } as typeof financePayments.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create" }, 500);
    // Workflow dispatch is isolated: a workflow failure must never fail
    // the payment creation itself.
    try {
      await dispatchWorkflowTrigger(db, "payment_received", row.id, {
        ...row,
        triggeredBy: user.id,
      });
    } catch (err) {
      console.error(
        "[Payments API] Failed to dispatch payment_received:",
        err,
      );
    }
    return c.json(row, 201);
  } catch (err) {
    return errorResponse(c, err, "Failed to create");
  }
});

app.get("/payments/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(financePayments)
      .where(eq(financePayments.id, c.req.param("id")))
      .limit(1);
    if (!row) return c.json({ error: "Payment not found" }, 404);
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch");
  }
});

app.put("/payments/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = updateFinancePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const [existing] = await db
      .select()
      .from(financePayments)
      .where(eq(financePayments.id, id))
      .limit(1);
    if (!existing) return c.json({ error: "Payment not found" }, 404);
    const fields = tableFields(financePayments, parsed.data, false);
    // Keep amount_bdt consistent whenever amount, currency or rate changes.
    if (
      parsed.data.amount !== undefined ||
      parsed.data.currency !== undefined ||
      parsed.data.exchangeRate !== undefined
    ) {
      const conversion = resolveBdtConversion(
        parsed.data.currency ?? existing.currency,
        parsed.data.amount ?? existing.amount,
        parsed.data.exchangeRate ?? existing.exchangeRate,
      );
      fields.currency = conversion.currency;
      fields.exchangeRate = conversion.exchangeRate;
      fields.amountBdt = conversion.amountBdt;
    }
    if (Object.keys(fields).length === 0) return c.json(existing);
    const [row] = await db
      .update(financePayments)
      .set(fields as typeof financePayments.$inferInsert)
      .where(eq(financePayments.id, id))
      .returning();
    if (!row) return c.json({ error: "Payment not found" }, 404);
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to update");
  }
});

app.delete("/payments/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const deleted = await db
      .delete(financePayments)
      .where(eq(financePayments.id, c.req.param("id")))
      .returning({ id: financePayments.id });
    if (deleted.length === 0) {
      return c.json({ error: "Payment not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});

// ─── Summary ─────────────────────────────────────────────────────────────────

app.get("/summary", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const sourceType = c.req.query("sourceType") ?? undefined;
    const sourceId = c.req.query("sourceId") ?? undefined;
    const agreedAmountBdt = c.req.query("agreedAmountBdt") ?? undefined;
    const db = getApiDb();

    // Per-source summary (FinanceSummaryRepository.getSourceSummary).
    if (sourceType && sourceId) {
      const [paymentRow] = await db
        .select({ total: sum(financePayments.amountBdt) })
        .from(financePayments)
        .where(
          and(
            eq(
              financePayments.sourceType,
              sourceType as (typeof paymentSourceType.enumValues)[number],
            ),
            eq(financePayments.sourceId, sourceId),
          ),
        );
      const [expenseRow] = await db
        .select({ total: sum(financeExpenses.amountBdt) })
        .from(financeExpenses)
        .where(
          and(
            eq(
              financeExpenses.sourceType,
              sourceType as (typeof expenseSourceType.enumValues)[number],
            ),
            eq(financeExpenses.sourceId, sourceId),
          ),
        );
      const totalReceivedBdt = Number(paymentRow?.total ?? 0);
      const totalExpensesBdt = Number(expenseRow?.total ?? 0);
      return c.json({
        sourceType,
        sourceId,
        totalReceivedBdt,
        totalExpensesBdt,
        pendingBdt: agreedAmountBdt
          ? round2(Number(agreedAmountBdt) - totalReceivedBdt)
          : null,
        netProfitBdt: round2(totalReceivedBdt - totalExpensesBdt),
      });
    }

    // Global summary (FinanceSummaryRepository.getGlobalSummary).
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const [incomeRow] = await db
      .select({ total: sum(financePayments.amountBdt) })
      .from(financePayments);
    const [incomeMonthRow] = await db
      .select({ total: sum(financePayments.amountBdt) })
      .from(financePayments)
      .where(gte(financePayments.paymentDate, monthStart));
    const [expenseRow] = await db
      .select({ total: sum(financeExpenses.amountBdt) })
      .from(financeExpenses);
    const [expenseMonthRow] = await db
      .select({ total: sum(financeExpenses.amountBdt) })
      .from(financeExpenses)
      .where(gte(financeExpenses.expenseDate, monthStart));
    const totalIncomeBdt = Number(incomeRow?.total ?? 0);
    const currentMonthIncomeBdt = Number(incomeMonthRow?.total ?? 0);
    const totalExpensesBdt = Number(expenseRow?.total ?? 0);
    const currentMonthExpensesBdt = Number(expenseMonthRow?.total ?? 0);

    const sourceRows = await db
      .select({
        sourceType: financePayments.sourceType,
        total: sum(financePayments.amountBdt),
      })
      .from(financePayments)
      .groupBy(financePayments.sourceType)
      .orderBy(desc(sum(financePayments.amountBdt)));
    const clientRows = await db
      .select({
        clientId: financePayments.clientId,
        total: sum(financePayments.amountBdt),
      })
      .from(financePayments)
      .where(isNotNull(financePayments.clientId))
      .groupBy(financePayments.clientId)
      .orderBy(desc(sum(financePayments.amountBdt)))
      .limit(10);

    // Monthly trend, last 12 months (source uses generate_series in SQL;
    // the same 12 YYYY-MM buckets are built here and filled from ranged
    // selects, so no raw SQL is needed on the Neon HTTP driver).
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }
    const rangeStart = `${months[0]}-01`;
    const trendIncomeRows = await db
      .select({
        date: financePayments.paymentDate,
        amountBdt: financePayments.amountBdt,
      })
      .from(financePayments)
      .where(gte(financePayments.paymentDate, rangeStart));
    const trendExpenseRows = await db
      .select({
        date: financeExpenses.expenseDate,
        amountBdt: financeExpenses.amountBdt,
      })
      .from(financeExpenses)
      .where(gte(financeExpenses.expenseDate, rangeStart));
    const incomeByMonth = new Map<string, number>();
    const expensesByMonth = new Map<string, number>();
    for (const row of trendIncomeRows) {
      const month = (row.date ?? "").slice(0, 7);
      if (!months.includes(month)) continue;
      incomeByMonth.set(
        month,
        round2((incomeByMonth.get(month) ?? 0) + Number(row.amountBdt ?? 0)),
      );
    }
    for (const row of trendExpenseRows) {
      const month = (row.date ?? "").slice(0, 7);
      if (!months.includes(month)) continue;
      expensesByMonth.set(
        month,
        round2(
          (expensesByMonth.get(month) ?? 0) + Number(row.amountBdt ?? 0),
        ),
      );
    }
    const monthlyTrend = months.map((month) => ({
      month,
      incomeBdt: incomeByMonth.get(month) ?? 0,
      expensesBdt: expensesByMonth.get(month) ?? 0,
    }));

    return c.json({
      totalIncomeBdt,
      currentMonthIncomeBdt,
      totalExpensesBdt,
      currentMonthExpensesBdt,
      netProfitBdt: round2(totalIncomeBdt - totalExpensesBdt),
      incomeBySourceType: sourceRows.map((row) => ({
        sourceType: row.sourceType,
        totalBdt: Number(row.total ?? 0),
      })),
      topClients: clientRows.map((row) => ({
        clientId: row.clientId as string,
        totalBdt: Number(row.total ?? 0),
      })),
      monthlyTrend,
    });
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch finance summary");
  }
});

export default app;
