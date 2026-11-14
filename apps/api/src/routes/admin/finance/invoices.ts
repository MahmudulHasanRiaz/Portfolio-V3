// Invoices admin routes (incl. PDF download / generation and the
// /status workflow trigger) — split from routes/admin/finance.ts
// (moved verbatim, behavior unchanged). Mounted at /finance by the
// coordinator via finance/index.ts.
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
import { and, count, desc, eq, inArray, like, sql } from "drizzle-orm";
import { z } from "zod";
import { financeInvoices, invoiceStatus, paymentSourceType } from "@repo/database/schema";
import { getApiDb, type ApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  parsePagination,
  readJsonBody,
  uuidParam,
} from "../../../lib/validate";
import {
  type Env,
  dispatchWorkflowTrigger,
  errorResponse,
  invalidBody,
  paymentSourceTypeSchema,
  resolveBdtConversion,
  round2,
  tableFields,
  timestampSchema,
  uuidSchema,
} from "./helpers";

const app = new Hono<Env>();

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


// ─── R2 (S3 SDK directly; mirrors routes/admin/media/helpers.ts) ────────────────────
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


const invoiceStatusSchema = z.enum(["draft", "sent", "paid", "cancelled"]);


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
const updateFinanceInvoiceSchema = financeInvoiceSchema
  // subtotal/total/totalBdt are server-computed, never client-supplied
  // (see the create schema comment). Omit them (and identity fields) so
  // a PUT that changes only notes/dates cannot smuggle client-supplied
  // totals past the recompute — the old .partial() accepted and wrote
  // them verbatim when lineItems/discount did not change.
  .omit({
    id: true,
    subtotal: true,
    total: true,
    totalBdt: true,
    createdBy: true,
    createdAt: true,
  })
  .partial();


// ─── Invoices ────────────────────────────────────────────────────────────────

app.get("/invoices", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query.bind(c.req); // NB: query() reads this.url, so it must stay bound to c.req.
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
    if (statuses !== undefined) {
      for (const st of statuses) {
        if (!invoiceStatusSchema.safeParse(st).success) {
          return c.json({ error: "Invalid status" }, 400);
        }
      }
    }
    if (
      sourceType !== undefined &&
      !paymentSourceTypeSchema.safeParse(sourceType).success
    ) {
      return c.json({ error: "Invalid sourceType" }, 400);
    }
    for (const [name, value] of [
      ["sourceId", sourceId],
      ["clientId", clientId],
    ] as const) {
      if (value !== undefined && !uuidSchema.safeParse(value).success) {
        return c.json({ error: `Invalid ${name}` }, 400);
      }
    }
    const { page, pageSize } = parsePagination(c);
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
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
app.get("/invoices/:id/pdf", async (c) => {
  const id = uuidParam(c, "id");
  if (!id) return invalidParam(c, "id");
  return invoicePdf(c, true, id);
});
app.post("/invoices/:id/pdf", async (c) => {
  const id = uuidParam(c, "id");
  if (!id) return invalidParam(c, "id");
  return invoicePdf(c, false, id);
});

app.get("/invoices/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(financeInvoices)
      .where(eq(financeInvoices.id, id))
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const deleted = await db
      .delete(financeInvoices)
      .where(eq(financeInvoices.id, id))
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
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


export default app;
