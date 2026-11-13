// Shared helpers for the proposals admin routes (split from
// routes/admin/proposals.ts — move-only refactor, no behavior change).
// Used by 2+ sub-files: the Env type, validation/error helpers
// (errorMessage, isRecord), the shared row lookups (getDocumentById,
// getTemplateById), and PDF generation (pdf-lib port of
// apps/dashboard/src/lib/pdf.ts generateProposalPdf + storePdf, plus
// the proposalPdf endpoint handler used by documents.ts).
import { type Context } from "hono";
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
import { eq } from "drizzle-orm";
import {
  proposalDocuments,
  proposalTemplates,
} from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";

export type Env = {
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

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

export async function getDocumentById(
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

export async function getTemplateById(
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

// ─── R2 (S3 SDK directly; mirrors routes/admin/media/helpers.ts) ────────────────────

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
 *  PdfWriter in routes/admin/finance/invoices.ts. */
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

export type ProposalDocumentRow = typeof proposalDocuments.$inferSelect;

export async function generateProposalPdf(
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
export async function proposalPdf(
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
