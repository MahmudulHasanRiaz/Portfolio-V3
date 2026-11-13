// Admin media library — item routes (split from media.ts, move-only).
// Routes: GET /, POST /upload, GET /:id, PUT /:id, PATCH /:id,
// DELETE /:id, GET /:id/download, POST /:id/restore, GET /usage/:id.
// Shared helpers live in ./helpers.ts; folder routes in ./folders.ts.
import { Hono } from "hono";
import type { Context } from "hono";
import { and, asc, count, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { mediaAssets } from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import { z } from "zod";
import { updateMediaAssetSchema, uuidSchema } from "@repo/validation";
import {
  invalidParam,
  isRecord,
  parsePagination,
  queryParam,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import {
  authorizeByEmailNeon,
  buildKey,
  deleteAsset,
  ensureR2,
  ensureUniqueSlug,
  findUsage,
  findUsageForAssets,
  ForbiddenError,
  getAssetById,
  getPublicUrl,
  getR2Bucket,
  MediaError,
  NotFoundError,
  R2_FOLDERS,
  sanitizeFilename,
  slugify,
  StorageError,
  toListItem,
  UnauthorizedError,
  updateMetadata,
  validateFile,
  ValidationError,
  type Env,
} from "./helpers";

const app = new Hono<Env>();

// Local schema for the POST /upload multipart form fields. The file
// itself keeps the existing validateFile MIME/extension/size checks
// exactly as-is (no magic-byte verification — intentionally not done,
// see the STANDARD note in the header); only the text fields are
// Zod-validated here.
const uploadFormSchema = z.object({
  folder: z.string().max(255).optional(),
  folderId: uuidSchema.optional(),
  altText: z.string().max(500).optional(),
});

// ─── List ────────────────────────────────────────────────────────────────────

app.get("/", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const { page, pageSize } = parsePagination(c, { defaultPageSize: 50 });
    const offset = (page - 1) * pageSize;
    const sortDirRaw = queryParam(c, "sortDir");
    if (
      sortDirRaw !== undefined &&
      sortDirRaw !== "asc" &&
      sortDirRaw !== "desc"
    ) {
      return c.json({ error: 'sortDir must be "asc" or "desc"' }, 400);
    }
    const sortDir = (sortDirRaw as "asc" | "desc") || "desc";
    const folderIdRaw = queryParam(c, "folderId");
    if (
      folderIdRaw !== undefined &&
      !uuidSchema.safeParse(folderIdRaw).success
    ) {
      return c.json({ error: "folderId must be a UUID" }, 400);
    }
    const uploadedByRaw = queryParam(c, "uploadedBy");
    if (
      uploadedByRaw !== undefined &&
      !uuidSchema.safeParse(uploadedByRaw).success
    ) {
      return c.json({ error: "uploadedBy must be a UUID" }, 400);
    }
    const typeRaw = queryParam(c, "type");
    if (typeRaw !== undefined && typeRaw.length > 50) {
      return c.json({ error: "type must be at most 50 characters" }, 400);
    }
    const queryRaw = queryParam(c, "query");
    if (queryRaw !== undefined && queryRaw.length > 255) {
      return c.json({ error: "query must be at most 255 characters" }, 400);
    }
    for (const flag of ["includeDeleted", "attached", "includeUsage"] as const) {
      const raw = queryParam(c, flag);
      if (raw !== undefined && raw !== "true" && raw !== "false") {
        return c.json({ error: `${flag} must be "true" or "false"` }, 400);
      }
    }
    const attached =
      queryParam(c, "attached") === "true"
        ? true
        : queryParam(c, "attached") === "false"
          ? false
          : undefined;
    const includeUsage = queryParam(c, "includeUsage") === "true";

    const conditions: any[] = [];
    if (queryParam(c, "includeDeleted") !== "true") {
      conditions.push(isNull(mediaAssets.deletedAt));
    }
    if (folderIdRaw) {
      conditions.push(eq(mediaAssets.folderId, folderIdRaw));
    }
    if (typeRaw) {
      // The UI sends a prefix ("image/", "video/") for categories — an
      // exact match on "image/" would never match "image/jpeg".
      conditions.push(
        typeRaw.endsWith("/")
          ? ilike(mediaAssets.type, `${typeRaw}%`)
          : eq(mediaAssets.type, typeRaw),
      );
    }
    if (uploadedByRaw) {
      conditions.push(eq(mediaAssets.uploadedBy, uploadedByRaw));
    }
    if (queryRaw) {
      conditions.push(
        or(
          ilike(mediaAssets.originalName, `%${queryRaw}%`),
          ilike(mediaAssets.altText, `%${queryRaw}%`),
          ilike(mediaAssets.filename, `%${queryRaw}%`),
          ilike(mediaAssets.slug, `%${queryRaw}%`),
        ),
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // UI sort keys map to real columns; anything unknown falls back to
    // newest-first instead of crashing on an unknown column.
    const sortColumnMap: Record<string, any> = {
      date: mediaAssets.createdAt,
      createdAt: mediaAssets.createdAt,
      name: mediaAssets.originalName,
      originalName: mediaAssets.originalName,
      filename: mediaAssets.filename,
      size: mediaAssets.size,
      type: mediaAssets.type,
    };
    const sortColumn =
      sortColumnMap[c.req.query("sortBy") || ""] || mediaAssets.createdAt;
    const orderBy = sortDir === "asc" ? asc(sortColumn) : desc(sortColumn);

    // Attachment filter / usage enrichment needs the real attachment
    // state, computed from content rows — load the matching rows,
    // compute usage once, then filter + paginate in memory.
    if (attached !== undefined || includeUsage) {
      const rows = await db
        .select()
        .from(mediaAssets)
        .where(where)
        .orderBy(orderBy);
      const usageById = await findUsageForAssets(
        db,
        c,
        rows as Array<{
          id: string;
          path?: string | null;
          variants?: Record<string, string> | null;
        }>,
      );
      let filtered = rows;
      if (attached !== undefined) {
        filtered = rows.filter((r) =>
          attached
            ? (usageById.get(r.id)?.length || 0) > 0
            : (usageById.get(r.id)?.length || 0) === 0,
        );
      }
      const total = filtered.length;
      const pageRows = filtered.slice(offset, offset + pageSize);
      return c.json({
        success: true,
        items: pageRows.map((item) =>
          toListItem(c, item, usageById.get(item.id) || []),
        ),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNextPage: page * pageSize < total,
          hasPreviousPage: page > 1,
        },
      });
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(mediaAssets)
      .where(where);
    const total = Number(totalResult?.count || 0);
    const items = await db
      .select()
      .from(mediaAssets)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);
    return c.json({
      success: true,
      items: items.map((item) => toListItem(c, item)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page * pageSize < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to fetch media" },
      500,
    );
  }
});

// ─── Upload ──────────────────────────────────────────────────────────────────
// Multipart formData ONLY on this route (the only media route that reads
// a body as form data in the original).

app.post("/upload", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user || !user.email) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const internalUser = await authorizeByEmailNeon(
      user.email,
      "media_manager",
      "admin",
      "super_admin",
    );
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const folder = (formData.get("folder") as string | null) || undefined;
    const folderId = (formData.get("folderId") as string | null) || undefined;
    const altText = (formData.get("altText") as string | null) || undefined;

    // Zod-validate the text form fields only. The file itself keeps
    // the existing validateFile MIME/extension/size checks exactly
    // as-is (no magic-byte verification — intentionally not done, see
    // the STANDARD note in the header).
    const fields = validateBody(
      {
        ...(folder !== undefined ? { folder } : {}),
        ...(folderId !== undefined ? { folderId } : {}),
        ...(altText !== undefined ? { altText } : {}),
      },
      uploadFormSchema,
    );
    if ("error" in fields) return c.json({ error: fields.error }, 400);
    const validatedFolder = fields.data.folder;
    const validatedFolderId = fields.data.folderId;
    const validatedAltText = fields.data.altText;

    const validation = validateFile(file.name, file.type, bytes.length);
    if (!validation.valid) {
      throw new ValidationError("File validation failed", {
        errors: validation.errors,
      });
    }
    // TODO (cutover): the original trusts the caller-supplied MIME here.
    // detectMimeType (magic bytes) exists in packages/media/src/validator.ts
    // but is never called on the upload path — verify the stored MIME
    // against the file bytes before cutover if that hardening is wanted.
    const sanitized = sanitizeFilename(file.name);
    const key = buildKey(validatedFolder || R2_FOLDERS.images, sanitized);
    const s3 = ensureR2(c);
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: getR2Bucket(),
          Key: key,
          Body: bytes,
          ContentType: file.type,
        }),
      );
    } catch (err) {
      throw new StorageError("Failed to upload file to storage.", {
        cause: err instanceof Error ? err.message : String(err),
      });
    }

    // TODO (cutover): image dimensions + variants are skipped here —
    // MediaService.upload reads dimensions and generates
    // thumbnail/small/medium/large webp/avif/jpeg variants via sharp
    // (Node-only, best-effort). See the header TODO.
    const category = validation.category || "document";
    const db = getApiDb();
    const slug = await ensureUniqueSlug(db, slugify(file.name) || "file");
    const [record] = await db
      .insert(mediaAssets)
      .values({
        filename: sanitized,
        originalName: file.name,
        path: key,
        type: file.type,
        size: bytes.length,
        width: null,
        height: null,
        altText: validatedAltText || null,
        slug,
        folderId: validatedFolderId || null,
        variants: null,
        uploadedBy: internalUser.id,
      })
      .returning();
    if (!record) throw new Error("Failed to save media record");
    return c.json(
      {
        success: true,
        data: {
          id: record.id,
          filename: record.filename || "",
          originalName: record.originalName || "",
          path: record.path || "",
          type: record.type || "",
          category,
          size: record.size || 0,
          width: record.width || undefined,
          height: record.height || undefined,
          variants: record.variants as Record<string, string> | undefined,
          url: getPublicUrl(c, key),
          slug: record.slug || undefined,
        },
      },
      201,
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return c.json({ error: err.message }, 401);
    }
    if (err instanceof ForbiddenError) {
      return c.json({ error: err.message }, 403);
    }
    if (err instanceof ValidationError) {
      return c.json(
        { error: err.message, details: err.details },
        400,
      );
    }
    if (err instanceof StorageError) {
      return c.json({ error: err.message }, 502);
    }
    if (err instanceof MediaError) {
      return c.json({ error: err.message }, err.statusCode);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      500,
    );
  }
});

// ─── Usage ───────────────────────────────────────────────────────────────────

app.get("/usage/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const usage = await findUsage(db, c, id);
    return c.json({ success: true, data: usage });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to find usage" },
      500,
    );
  }
});

// ─── Single asset ────────────────────────────────────────────────────────────

app.get("/:id/download", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user || !user.email) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await authorizeByEmailNeon(
      user.email,
      "media_manager",
      "admin",
      "super_admin",
    );
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const asset = await getAssetById(db, c, id);
    if (!asset.path) {
      return c.json({ error: "File not found" }, 404);
    }
    const s3 = ensureR2(c);
    let obj;
    try {
      obj = await s3.send(
        new GetObjectCommand({ Bucket: getR2Bucket(), Key: asset.path }),
      );
    } catch {
      return c.json({ error: "Failed to fetch file from storage" }, 502);
    }
    if (!obj.Body) {
      return c.json({ error: "Failed to fetch file from storage" }, 502);
    }
    const filename = asset.originalName || asset.filename || "file";
    const contentType =
      asset.type || obj.ContentType || "application/octet-stream";
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${safeFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    if (obj.ContentLength !== undefined) {
      headers.set("Content-Length", String(obj.ContentLength));
    }
    // Stream the R2 object body straight through, as the original did
    // with the upstream fetch body.
    return new Response(obj.Body as ReadableStream, {
      status: 200,
      headers,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return c.json({ error: err.message }, 401);
    }
    if (err instanceof ForbiddenError) {
      return c.json({ error: err.message }, 403);
    }
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    if (err instanceof MediaError) {
      return c.json({ error: err.message }, err.statusCode);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "Download failed" },
      500,
    );
  }
});

/** ASCII-safe fallback filename for the Content-Disposition header. */
function safeFilename(name: string): string {
  const base = name
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "file";
}

app.post("/:id/restore", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    await db
      .update(mediaAssets)
      .set({ deletedAt: null })
      .where(eq(mediaAssets.id, id));
    const asset = await getAssetById(db, c, id);
    return c.json({ success: true, data: asset });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to restore media" },
      500,
    );
  }
});

app.get("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const asset = await getAssetById(db, c, id);
    return c.json({ success: true, data: asset });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to fetch media" },
      500,
    );
  }
});

async function updateAssetHandler(c: Context<Env>) {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    // Reuse the shared update schema. Two extensions: folderId may be
    // null (clear the folder — the base schema only allows a UUID) and
    // `slug` is accepted (it is not in the shared schema, but
    // updateMetadata validates its format + uniqueness itself).
    // Server-managed fields in the partial schema (id, uploadedBy,
    // createdAt, deletedAt) are never passed to updateMetadata below.
    const v = validateBody(
      body,
      updateMediaAssetSchema.extend({
        folderId: uuidSchema.nullable().optional(),
        slug: z.string().optional(),
      }),
    );
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    const db = getApiDb();
    await updateMetadata(db, c, id, {
      altText: data.altText,
      folderId: data.folderId,
      originalName: data.originalName,
      // `filename` is accepted as a display-name alias; the stored R2 key
      // never changes (content rows reference the public URL).
      filename: data.filename,
      slug: data.slug,
    });
    const updated = await getAssetById(db, c, id);
    return c.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    if (err instanceof MediaError) {
      return c.json({ error: err.message }, err.statusCode);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to update media" },
      500,
    );
  }
}

// Original verb is PATCH; PUT is registered as an alias (see header).
app.patch("/:id", updateAssetHandler);
app.put("/:id", updateAssetHandler);

app.delete("/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    await deleteAsset(c, db, id);
    return c.json({ success: true });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to delete media" },
      500,
    );
  }
});

export default app;
