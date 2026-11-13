// Admin media library — Hono port of apps/admin/src/app/api/media/.
// Converted routes (mounted at /media by the coordinator):
//   GET    /                     — list (MediaService.list)
//   GET    /:id                  — one asset (MediaService.getById)
//   PATCH  /:id  (+ PUT alias)   — update metadata (MediaService.updateMetadata)
//   DELETE /:id                  — soft-delete (MediaService.delete)
//   GET    /:id/download         — stream the file as an attachment
//   POST   /:id/restore          — clear deletedAt (MediaService.restore)
//   GET    /folders              — folder tree (MediaService.getFolderTree)
//   POST   /folders              — create folder (MediaService.createFolder)
//   GET    /folders/:id          — one folder (no Next.js original; added
//                                  so the route has the GET the Hono table
//                                  lists — returns the raw folder row)
//   PATCH  /folders/:id (+ PUT)  — rename folder (MediaService.renameFolder)
//   DELETE /folders/:id          — delete folder (MediaService.deleteFolder)
//   POST   /upload               — multipart upload (MediaService.upload)
//   GET    /usage/:id            — where the asset is referenced
//                                  (MediaService.findUsage)
//
// Method notes (originals differ from the Hono route table in two places):
// - media/[id] is PATCH in Next.js, not PUT; both verbs are registered
//   here so the admin UI's PATCH keeps working and the PUT name works too.
// - media/folders/[id] is PATCH + DELETE in Next.js (no GET); PUT is
//   registered as an alias of PATCH and GET returns the single folder.
//
// Fidelity notes:
// - Response shapes match the Next.js routes exactly: list returns
//   { success: true, items, pagination }; single-asset/folder/usage
//   routes return { success: true, data }; delete/restore return
//   { success: true } / { success: true, data }; upload returns
//   { success: true, data } with 201; errors are { error } (+ details
//   on upload validation failures).
// - Every handler starts with requireAuth (the 6 media CRUD routes had
//   NO in-body auth in Next.js — only the middleware cookie-presence
//   check — so Hono adds the real session check here). Upload and
//   download additionally enforce authorizeByEmail(email,
//   "media_manager", "admin", "super_admin").
// - @repo/media is NOT imported: its service layer is TCP-bound
//   (createMediaRepositories -> getSql / postgres.js) and its image
//   pipeline needs sharp (Node-only). The DB queries below are direct
//   Drizzle on media_assets / media_folders over the Neon HTTP db, and
//   R2 is used through the S3 SDK directly (S3Client with
//   R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY, region "auto",
//   forcePathStyle, exactly as packages/media/src/r2.ts does).
// - Upload validation (packages/media/src/validator.ts + config.ts) is
//   ported inline: 16 allowed MIME types, extension must match the
//   MIME, per-category caps image 10 MB / video 200 MB / audio 50 MB /
//   document 20 MB / archive 50 MB. The original trusts the
//   caller-supplied MIME — detectMimeType (magic bytes) exists in the
//   package but is never called on the upload path; that behaviour is
//   preserved here (see TODO below).
// - Download streams the R2 object body straight through (GetObject
//   body as the response body) with the same Content-Type /
//   Content-Disposition / Content-Length headers as the original, which
//   fetched asset.url server-side and proxied the stream (same-origin
//   CORS workaround: files.riaz.com.bd sends no ACAO header). Going
//   direct to R2 with GetObjectCommand removes the extra public-URL
//   fetch hop; the 3600 s presigned-URL expiry from
//   generatePresignedDownloadUrl applies to that helper, not to this
//   route, so no presigned URL is minted here.
//
// TODO (cutover, deliberately NOT done here):
// - Image variants + width/height: MediaService.upload reads image
//   dimensions and generates thumbnail/small/medium/large variants in
//   webp/avif/jpeg via sharp, best-effort (failures swallowed). Sharp
//   cannot run on Workers, so uploads here store variants: null and
//   width/height: null. Variant generation needs a separate image
//   pipeline (or a Node service) at cutover; until then the admin UI
//   will see no variants on newly uploaded images.
// - purgePublicCache / dispatchTrigger / search-indexer side effects:
//   the media routes never called any of these in Next.js, so there is
//   nothing to wire — noted only so a later audit does not assume a gap.
// - TODO (magic bytes): wire detectMimeType on the upload path so the
//   stored MIME is verified against the file bytes instead of trusting
//   the caller-supplied MIME (the original never did this).
//
// Env: R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY /
// R2_BUCKET (+ optional R2_PUBLIC_URL) must be set as Worker secrets /
// vars. They are read from c.env first, then process.env (the same
// fallback db.ts uses for DATABASE_URL). The S3 client is a lazy
// module-level singleton, mirroring packages/media/src/r2.ts.
import { Hono } from "hono";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { and, asc, count, desc, eq, ilike, isNull, ne, or } from "drizzle-orm";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
  caseStudies,
  homepageSections,
  mediaAssets,
  mediaFolders,
  pages,
  personProfiles,
  posts,
  projects,
  releases,
  roles,
  services,
  userRoles,
  users,
  ventures,
} from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import { z } from "zod";
import {
  createMediaFolderSchema,
  updateMediaAssetSchema,
  updateMediaFolderSchema,
  uuidSchema,
} from "@repo/validation";
import {
  invalidParam,
  isRecord,
  parsePagination,
  queryParam,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../lib/validate";

// Local schema for the POST /upload multipart form fields. The file
// itself keeps the existing validateFile MIME/extension/size checks
// exactly as-is (no magic-byte verification — see the header TODO);
// only the text fields are Zod-validated here.
const uploadFormSchema = z.object({
  folder: z.string().max(255).optional(),
  folderId: uuidSchema.optional(),
  altText: z.string().max(500).optional(),
});

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

// ─── Errors (mirrors packages/media/src/errors.ts) ──────────────────────────

class MediaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: ContentfulStatusCode = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "MediaError";
  }
}

class ValidationError extends MediaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

class StorageError extends MediaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "STORAGE_ERROR", 500, details);
    this.name = "StorageError";
  }
}

class NotFoundError extends MediaError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, "NOT_FOUND", 404, { entity, id });
    this.name = "NotFoundError";
  }
}

/** Mirrors packages/auth/src/lib/authorization.ts (UnauthorizedError /
 *  ForbiddenError). The original routes let these fall through to the
 *  generic 500 catch (they are not MediaErrors); here they are mapped
 *  to 401 / 403 explicitly — see the upload/download catch blocks. */
class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

class ForbiddenError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// ─── Upload policy (mirrors packages/media/src/config.ts) ───────────────────

const ALLOWED_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/gzip",
  "text/csv",
  "application/json",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
];

const ALLOWED_EXTENSIONS: Record<string, readonly string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
  "image/gif": [".gif"],
  "image/svg+xml": [".svg"],
  "application/pdf": [".pdf"],
  "application/zip": [".zip"],
  "application/gzip": [".gz", ".tar.gz"],
  "text/csv": [".csv"],
  "application/json": [".json"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/ogg": [".ogg"],
};

const MIME_CATEGORY: Record<string, string> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/avif": "image",
  "image/gif": "image",
  "image/svg+xml": "image",
  "application/pdf": "document",
  "application/zip": "archive",
  "application/gzip": "archive",
  "text/csv": "document",
  "application/json": "document",
  "video/mp4": "video",
  "video/webm": "video",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
};

const SIZE_LIMITS: Record<string, number> = {
  image: 10 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  document: 20 * 1024 * 1024,
  archive: 50 * 1024 * 1024,
};

const R2_FOLDERS: { base: string; images: string } = {
  base: "uploads",
  images: "uploads/images",
};

type MediaCategory = "image" | "video" | "audio" | "document" | "archive";

// ─── Validator helpers (mirrors packages/media/src/validator.ts) ────────────
// Hand-rolled extname/basename (no node:path import) so this file stays
// Workers-safe; semantics match path.extname / path.basename for the
// filenames the admin UI sends.

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return "";
  return fileName.slice(dot).toLowerCase();
}

function validateFile(
  fileName: string,
  mimeType: string,
  fileSize: number,
): { valid: boolean; errors: string[]; category?: MediaCategory } {
  const errors: string[] = [];
  if (!fileName || !mimeType) {
    return {
      valid: false,
      errors: ["File name and MIME type are required."],
    };
  }
  const ext = fileExtension(fileName);
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    errors.push(`MIME type "${mimeType}" is not allowed.`);
  }
  const allowedExts = ALLOWED_EXTENSIONS[mimeType];
  if (allowedExts && !allowedExts.includes(ext)) {
    errors.push(
      `File extension "${ext}" does not match MIME type "${mimeType}".`,
    );
  }
  const category = MIME_CATEGORY[mimeType] as MediaCategory | undefined;
  if (!category) {
    errors.push(`Unsupported MIME type "${mimeType}".`);
  }
  if (category) {
    const limit = SIZE_LIMITS[category] ?? 0;
    if (limit > 0 && fileSize > limit) {
      const limitMB = limit / (1024 * 1024);
      errors.push(
        `File size exceeds ${limitMB}MB limit for ${category} files.`,
      );
    }
  }
  return { valid: errors.length === 0, errors, category };
}

function sanitizeFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const ext = dot > 0 ? filename.slice(dot) : "";
  const name = dot > 0 ? filename.slice(0, dot) : filename;
  const sanitized =
    name
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "unnamed";
  return `${sanitized}-${Date.now()}${ext}`;
}

function slugify(value: string): string {
  const base = value.replace(/\.[a-zA-Z0-9]+$/, "");
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 255;
}

// ─── R2 (S3 SDK directly; mirrors packages/media/src/r2.ts) ────────────────

let r2Client: S3Client | null = null;
let r2Bucket = "";

function ensureR2(c: Context<Env>): S3Client {
  if (r2Client) return r2Client;
  const env = c.env ?? {};
  const endpoint = env.R2_ENDPOINT ?? process.env.R2_ENDPOINT ?? "";
  const accessKeyId =
    env.R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey =
    env.R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY ?? "";
  const bucket = env.R2_BUCKET ?? process.env.R2_BUCKET ?? "";
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new StorageError("R2 client not initialized. Call initR2() first.");
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

function getR2Bucket(): string {
  if (!r2Bucket) throw new StorageError("R2 bucket not configured.");
  return r2Bucket;
}

function getR2UrlParts(c: Context<Env>): {
  bucket: string;
  publicUrl: string;
} {
  // Resolved per request (no caching): read paths (list/get/usage) never
  // create an S3 client, but still need the public URL — mirroring
  // r2.ts, where getPublicUrl lazily initialises from env on every call.
  const env = c.env ?? {};
  return {
    bucket: env.R2_BUCKET ?? process.env.R2_BUCKET ?? "",
    publicUrl: env.R2_PUBLIC_URL ?? process.env.R2_PUBLIC_URL ?? "",
  };
}

function getPublicUrl(c: Context<Env>, key: string): string {
  const { bucket, publicUrl } = getR2UrlParts(c);
  if (publicUrl) {
    return `${publicUrl.replace(/\/+$/, "")}/${key}`;
  }
  if (!bucket) throw new StorageError("R2 bucket not configured.");
  return `${bucket}/${key}`;
}

function buildKey(folder: string, filename: string): string {
  const normalizedFolder = folder.replace(/^\/+|\/+$/g, "");
  return `${normalizedFolder}/${filename}`;
}

// ─── Role check (re-implemented on the Neon HTTP DB) ─────────────────────────
// packages/auth/src/lib/authorization.ts authorizeByEmail is TCP-bound
// (getDb() from @repo/database, postgres.js) and cannot run on Workers.
// Same semantics, direct Drizzle: look the Better Auth email up in the
// internal `users` table, require an active account, then require one of
// the given roles (DB stores display names like "Super Admin"; consumers
// expect snake_case slugs, so names are slugified at the source). No
// 60 s in-process role cache here: Workers isolates do not share module
// state, so the lookup runs per request.

function slugifyRoleName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

interface InternalUser {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean | null;
}

async function authorizeByEmailNeon(
  email: string,
  ...requiredRoles: string[]
): Promise<InternalUser> {
  const db = getApiDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) {
    throw new UnauthorizedError("User not found in internal registry");
  }
  if (!user.isActive) {
    throw new ForbiddenError("User account is disabled");
  }
  if (requiredRoles.length > 0) {
    const roleRows = await db
      .select({ roleId: userRoles.roleId, roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));
    const roleSlugs = [
      ...new Set(roleRows.map((r) => slugifyRoleName(r.roleName))),
    ];
    if (!requiredRoles.some((r) => roleSlugs.includes(r))) {
      throw new ForbiddenError(
        `Required role: ${requiredRoles.join(" or ")}. Actual: ${
          roleSlugs.join(", ") || "none"
        }`,
      );
    }
  }
  return user;
}

// ─── Media DB helpers (mirrors packages/media/src/service.ts) ───────────────

type ApiDb = ReturnType<typeof getApiDb>;
type MediaAssetRow = typeof mediaAssets.$inferSelect;

async function getAssetById(
  db: ApiDb,
  c: Context<Env>,
  id: string,
): Promise<MediaAssetRow & { url: string }> {
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);
  if (!asset) throw new NotFoundError("MediaAsset", id);
  return { ...asset, url: asset.path ? getPublicUrl(c, asset.path) : "" };
}

async function ensureUniqueSlug(
  db: ApiDb,
  base: string,
  excludeId?: string,
): Promise<string> {
  const clean = slugify(base) || "file";
  let candidate = clean;
  let n = 2;
  for (;;) {
    const where = excludeId
      ? and(eq(mediaAssets.slug, candidate), ne(mediaAssets.id, excludeId))
      : eq(mediaAssets.slug, candidate);
    const [existing] = await db
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .where(where)
      .limit(1);
    if (!existing) return candidate;
    candidate = `${clean}-${n++}`;
  }
}

function toListItem(
  c: Context<Env>,
  item: MediaAssetRow,
  usage?: Array<{ type: string; id: string; title?: string; field: string; url: string }>,
) {
  return {
    id: item.id,
    filename: item.filename || "",
    originalName: item.originalName || "",
    path: item.path || "",
    type: item.type || "",
    size: item.size || 0,
    width: item.width || undefined,
    height: item.height || undefined,
    altText: item.altText || undefined,
    slug: item.slug || undefined,
    folderId: item.folderId || undefined,
    variants: item.variants as Record<string, string> | undefined,
    uploadedBy: item.uploadedBy,
    createdAt: item.createdAt,
    deletedAt: item.deletedAt,
    url: item.path ? getPublicUrl(c, item.path) : "",
    ...(usage !== undefined
      ? { attachedCount: usage.length, attachedTo: usage.slice(0, 5) }
      : {}),
  };
}

// Content tables that can reference a media asset, and the exact columns
// that hold media URLs (media is stored as a URL/path string in these
// columns, never as an asset id). Mirrors USAGE_SOURCES in service.ts.
const USAGE_SOURCES: Array<{
  table: any;
  label: string;
  dashboardUrl: string;
  titleField: string;
  fields: string[];
}> = [
  { table: posts, label: "Blog Post", dashboardUrl: "/dashboard/blog", titleField: "title", fields: ["coverImage", "thumbnailUrl", "thumbnailVideoUrl", "ogImage", "videos", "galleryImages", "content"] },
  { table: projects, label: "Project", dashboardUrl: "/dashboard/projects", titleField: "title", fields: ["thumbnail", "coverImage", "thumbnailUrl", "thumbnailVideoUrl", "ogImage", "videos", "galleryImages", "description"] },
  { table: caseStudies, label: "Case Study", dashboardUrl: "/dashboard/case-studies", titleField: "title", fields: ["thumbnailUrl", "thumbnailVideoUrl", "ogImage", "videos", "galleryImages"] },
  { table: services, label: "Service", dashboardUrl: "/dashboard/services", titleField: "title", fields: ["ogImage"] },
  { table: pages, label: "Page", dashboardUrl: "/dashboard/content/pages", titleField: "title", fields: ["ogImage", "content"] },
  { table: releases, label: "Release", dashboardUrl: "/dashboard/releases", titleField: "title", fields: ["coverImage", "ogImage"] },
  { table: ventures, label: "Venture", dashboardUrl: "/dashboard/ventures", titleField: "name", fields: ["logo", "coverImage", "thumbnailUrl", "thumbnailVideoUrl", "ogImage", "videos", "galleryImages"] },
  { table: personProfiles, label: "Profile", dashboardUrl: "/dashboard/settings/brand-identity", titleField: "fullName", fields: ["profileImage", "coverImage", "resumeUrl"] },
  { table: homepageSections, label: "Homepage Section", dashboardUrl: "/dashboard/homepage", titleField: "sectionKey", fields: ["content"] },
];

interface UsageRef {
  label: string;
  dashboardUrl: string;
  id: string;
  title: string;
  field: string;
  haystack: string;
}

interface MediaUsage {
  type: string;
  id: string;
  title?: string;
  field: string;
  url: string;
}

async function loadUsageRefs(db: ApiDb): Promise<UsageRef[]> {
  const refs: UsageRef[] = [];
  for (const source of USAGE_SOURCES) {
    let rows: any[];
    try {
      rows = await db.select().from(source.table);
    } catch {
      continue;
    }
    for (const row of rows) {
      const record = row as Record<string, unknown>;
      for (const field of source.fields) {
        const value = record[field];
        if (value === null || value === undefined || value === "") continue;
        const haystack =
          typeof value === "string" ? value : JSON.stringify(value);
        if (!haystack || haystack === "[]" || haystack === "{}" || haystack === '""') continue;
        refs.push({
          label: source.label,
          dashboardUrl: source.dashboardUrl,
          id: String(record.id),
          title: String(record[source.titleField] || record.id),
          field,
          haystack,
        });
      }
    }
  }
  return refs;
}

async function findUsageForAssets(
  db: ApiDb,
  c: Context<Env>,
  assets: Array<{
    id: string;
    path?: string | null;
    variants?: Record<string, string> | null;
  }>,
): Promise<Map<string, MediaUsage[]>> {
  const result = new Map<string, MediaUsage[]>();
  for (const a of assets) result.set(a.id, []);
  if (assets.length === 0) return result;
  const refs = await loadUsageRefs(db);
  for (const asset of assets) {
    const needles = [
      asset.path,
      asset.path ? getPublicUrl(c, asset.path) : null,
    ]
      .concat(asset.variants ? Object.values(asset.variants) : [])
      .filter((n): n is string => !!n);
    if (needles.length === 0) continue;
    const usage = result.get(asset.id)!;
    for (const ref of refs) {
      if (needles.some((n) => ref.haystack.includes(n))) {
        usage.push({
          type: ref.label,
          id: ref.id,
          title: ref.title,
          field: ref.field,
          url: ref.dashboardUrl,
        });
      }
    }
  }
  return result;
}

async function findUsage(db: ApiDb, c: Context<Env>, assetId: string): Promise<MediaUsage[]> {
  const asset = await getAssetById(db, c, assetId);
  const map = await findUsageForAssets(db, c, [
    {
      id: asset.id,
      path: asset.path,
      variants: asset.variants as Record<string, string> | null,
    },
  ]);
  return map.get(assetId) || [];
}

async function updateMetadata(
  db: ApiDb,
  c: Context<Env>,
  id: string,
  data: {
    altText?: string;
    folderId?: string | null;
    originalName?: string;
    filename?: string;
    slug?: string;
  },
): Promise<void> {
  const asset = await getAssetById(db, c, id);
  // Rename = the display name (originalName). `filename` is accepted as
  // an alias for the same display name. The stored filename / R2 key is
  // deliberately NOT renamed: content rows reference the public URL.
  const displayName = data.originalName ?? data.filename;
  const nextName =
    displayName !== undefined ? displayName.trim() : asset.originalName;
  if (displayName !== undefined && !nextName) {
    throw new ValidationError("File name cannot be empty.");
  }
  // Slug: validate format + uniqueness; empty string means
  // "auto-suggest from the (new) file name". Assets without a slug get
  // one on edit.
  let nextSlug: string | undefined;
  if (data.slug !== undefined) {
    const raw = data.slug.trim();
    if (raw === "") {
      nextSlug = await ensureUniqueSlug(
        db,
        slugify(nextName || asset.filename || "file"),
        id,
      );
    } else {
      if (!isValidSlug(raw)) {
        throw new ValidationError(
          "Slug may only contain lowercase letters, numbers and single hyphens.",
        );
      }
      const [clash] = await db
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(and(eq(mediaAssets.slug, raw), ne(mediaAssets.id, id)))
        .limit(1);
      if (clash) {
        throw new MediaError(
          `Slug "${raw}" is already used by another media file.`,
          "SLUG_CONFLICT",
          409,
        );
      }
      nextSlug = raw;
    }
  } else if (!asset.slug) {
    nextSlug = await ensureUniqueSlug(
      db,
      slugify(nextName || asset.filename || "file"),
      id,
    );
  }
  await db
    .update(mediaAssets)
    .set({
      ...(data.altText !== undefined ? { altText: data.altText } : {}),
      ...(data.folderId !== undefined ? { folderId: data.folderId } : {}),
      ...(displayName !== undefined ? { originalName: nextName } : {}),
      ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
    })
    .where(eq(mediaAssets.id, id));
}

async function deleteAsset(c: Context<Env>, db: ApiDb, id: string): Promise<void> {
  const asset = await getAssetById(db, c, id);
  if (asset.path) {
    try {
      const s3 = ensureR2(c);
      const bucket = getR2Bucket();
      await s3.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: asset.path }),
      );
      if (asset.variants) {
        const variantUrls = Object.values(
          asset.variants as Record<string, string>,
        );
        for (const url of variantUrls) {
          try {
            const urlObj = new URL(url);
            const key = urlObj.pathname.replace(/^\//, "");
            await s3.send(
              new DeleteObjectCommand({ Bucket: bucket, Key: key }),
            );
          } catch {
            // Per-variant delete failures are swallowed in the original.
          }
        }
      }
    } catch (err) {
      throw new StorageError("Failed to delete file from storage.", {
        cause: err instanceof Error ? err.message : String(err),
      });
    }
  }
  await db
    .update(mediaAssets)
    .set({ deletedAt: new Date() })
    .where(eq(mediaAssets.id, id));
}

interface FolderNode {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  children: FolderNode[];
  assetCount?: number;
}

async function listFolders(
  db: ApiDb,
  parentId: string | null,
): Promise<FolderNode[]> {
  const where = parentId
    ? eq(mediaFolders.parentId, parentId)
    : isNull(mediaFolders.parentId);
  const folders = await db.select().from(mediaFolders).where(where);
  const nodes: FolderNode[] = [];
  for (const f of folders) {
    const [assetCount] = await db
      .select({ count: count() })
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.folderId, f.id),
          isNull(mediaAssets.deletedAt),
        ),
      );
    const children = await listFolders(db, f.id);
    nodes.push({
      id: f.id,
      name: f.name || "",
      path: f.path || "",
      parentId: f.parentId,
      children,
      assetCount: Number(assetCount?.count || 0),
    });
  }
  return nodes;
}

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

// ─── Folders ─────────────────────────────────────────────────────────────────
// Registered BEFORE /:id so the static "folders" segment wins over the
// :id param (same convention as routes/admin/content.ts).

app.get("/folders", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const folders = await listFolders(db, null);
    return c.json({ success: true, data: folders });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to fetch folders" },
      500,
    );
  }
});

app.post("/folders", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    // Reuse the shared folder schema for name + parentId; `path` is
    // server-computed below, so it is picked out of the schema.
    const v = validateBody(
      body,
      createMediaFolderSchema.pick({ name: true, parentId: true }),
    );
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data;
    if (!data.name) {
      return c.json({ error: "Folder name is required" }, 400);
    }
    const db = getApiDb();
    const parentId = data.parentId;
    let folderPath = R2_FOLDERS.base;
    if (parentId) {
      const [parent] = await db
        .select()
        .from(mediaFolders)
        .where(eq(mediaFolders.id, parentId))
        .limit(1);
      if (parent) {
        folderPath = `${parent.path}/${data.name}`;
      }
    } else {
      folderPath = `${R2_FOLDERS.base}/${data.name}`;
    }
    const [created] = await db
      .insert(mediaFolders)
      .values({
        name: data.name,
        parentId: parentId || null,
        path: folderPath,
      })
      .returning();
    if (!created) throw new Error("Failed to create folder");
    return c.json(
      {
        success: true,
        data: {
          id: created.id,
          name: created.name || "",
          path: created.path || "",
          parentId: created.parentId,
          children: [],
        },
      },
      201,
    );
  } catch (err) {
    if (err instanceof MediaError) {
      return c.json({ error: err.message }, err.statusCode);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to create folder" },
      500,
    );
  }
});

app.get("/folders/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [folder] = await db
      .select()
      .from(mediaFolders)
      .where(eq(mediaFolders.id, id))
      .limit(1);
    if (!folder) throw new NotFoundError("MediaFolder", id);
    return c.json({ success: true, data: folder });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to fetch folder" },
      500,
    );
  }
});

async function renameFolderHandler(c: Context<Env>) {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateMediaFolderSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    // Server-managed fields in the partial schema (id, createdAt) are
    // never read below, so they cannot be written.
    const data = v.data;
    if (!data.name) {
      return c.json({ error: "Folder name is required" }, 400);
    }
    const db = getApiDb();
    const [folder] = await db
      .select()
      .from(mediaFolders)
      .where(eq(mediaFolders.id, id))
      .limit(1);
    if (!folder) throw new NotFoundError("MediaFolder", id);
    const parentId = folder.parentId;
    const parentPath = parentId
      ? (
          await db
            .select()
            .from(mediaFolders)
            .where(eq(mediaFolders.id, parentId))
            .limit(1)
        )[0]?.path
      : null;
    const basePath = parentPath || R2_FOLDERS.base;
    const newPath = `${basePath}/${data.name}`;
    await db
      .update(mediaFolders)
      .set({ name: data.name, path: newPath })
      .where(eq(mediaFolders.id, id));
    return c.json({ success: true });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to rename folder" },
      500,
    );
  }
}

// Original verb is PATCH; PUT is registered as an alias (see header).
app.patch("/folders/:id", renameFolderHandler);
app.put("/folders/:id", renameFolderHandler);

app.delete("/folders/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const children = await db
      .select()
      .from(mediaFolders)
      .where(eq(mediaFolders.parentId, id));
    if (children.length > 0) {
      throw new MediaError(
        "Cannot delete folder with subfolders.",
        "FOLDER_HAS_CHILDREN",
        400,
      );
    }
    const [assetCount] = await db
      .select({ count: count() })
      .from(mediaAssets)
      .where(eq(mediaAssets.folderId, id));
    if (Number(assetCount?.count || 0) > 0) {
      throw new MediaError(
        "Cannot delete folder with assets.",
        "FOLDER_HAS_ASSETS",
        400,
      );
    }
    await db.delete(mediaFolders).where(eq(mediaFolders.id, id));
    return c.json({ success: true });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    if (err instanceof MediaError) {
      return c.json({ error: err.message }, err.statusCode);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to delete folder" },
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
    // as-is (no magic-byte verification — see the header TODO).
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
