// Admin media library — shared helpers (split from media.ts, move-only).
// Used by ./items.ts and ./media/folders.ts. Route handlers live in those
// files; this file holds the error classes, upload policy, validator and
// R2 helpers, the Neon role check, and the media DB helpers.

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
//   preserved here by design (see the STANDARD note below).
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
// - STANDARD (magic bytes — intentionally NOT done): the stored MIME
//   is NOT verified against the file bytes. Only authenticated admins
//   can upload, and the existing extension + MIME + size checks are
//   the right level for an admin-only upload path; a magic-byte check
//   risks rejecting legitimate files (e.g. a valid image whose header
//   the detector misreads). detectMimeType stays unused here.
//
// Env: R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY /
// R2_BUCKET (+ optional R2_PUBLIC_URL) must be set as Worker secrets /
// vars. They are read from c.env first, then process.env (the same
// fallback db.ts uses for DATABASE_URL). The S3 client is a lazy
// module-level singleton, mirroring packages/media/src/r2.ts.
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { and, count, eq, isNull, ne } from "drizzle-orm";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
import { getApiDb } from "../../../db";

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

// ─── Errors (mirrors packages/media/src/errors.ts) ──────────────────────────

export class MediaError extends Error {
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

export class ValidationError extends MediaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class StorageError extends MediaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "STORAGE_ERROR", 500, details);
    this.name = "StorageError";
  }
}

export class NotFoundError extends MediaError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, "NOT_FOUND", 404, { entity, id });
    this.name = "NotFoundError";
  }
}

/** Mirrors packages/auth/src/lib/authorization.ts (UnauthorizedError /
 *  ForbiddenError). The original routes let these fall through to the
 *  generic 500 catch (they are not MediaErrors); here they are mapped
 *  to 401 / 403 explicitly — see the upload/download catch blocks. */
export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// ─── Upload policy (mirrors packages/media/src/config.ts) ───────────────────

export const ALLOWED_MIME_TYPES: readonly string[] = [
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

export const ALLOWED_EXTENSIONS: Record<string, readonly string[]> = {
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

export const MIME_CATEGORY: Record<string, string> = {
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

export const SIZE_LIMITS: Record<string, number> = {
  image: 10 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  document: 20 * 1024 * 1024,
  archive: 50 * 1024 * 1024,
};

export const R2_FOLDERS: { base: string; images: string } = {
  base: "uploads",
  images: "uploads/images",
};

export type MediaCategory = "image" | "video" | "audio" | "document" | "archive";

// ─── Validator helpers (mirrors packages/media/src/validator.ts) ────────────
// Hand-rolled extname/basename (no node:path import) so this file stays
// Workers-safe; semantics match path.extname / path.basename for the
// filenames the admin UI sends.

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return "";
  return fileName.slice(dot).toLowerCase();
}

export function validateFile(
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

export function sanitizeFilename(filename: string): string {
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

export function slugify(value: string): string {
  const base = value.replace(/\.[a-zA-Z0-9]+$/, "");
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 255;
}

// ─── R2 (S3 SDK directly; mirrors packages/media/src/r2.ts) ────────────────

export let r2Client: S3Client | null = null;
export let r2Bucket = "";

export function ensureR2(c: Context<Env>): S3Client {
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

export function getR2Bucket(): string {
  if (!r2Bucket) throw new StorageError("R2 bucket not configured.");
  return r2Bucket;
}

export function getR2UrlParts(c: Context<Env>): {
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

export function getPublicUrl(c: Context<Env>, key: string): string {
  const { bucket, publicUrl } = getR2UrlParts(c);
  if (publicUrl) {
    return `${publicUrl.replace(/\/+$/, "")}/${key}`;
  }
  if (!bucket) throw new StorageError("R2 bucket not configured.");
  return `${bucket}/${key}`;
}

export function buildKey(folder: string, filename: string): string {
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

export function slugifyRoleName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export interface InternalUser {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean | null;
}

export async function authorizeByEmailNeon(
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

export type ApiDb = ReturnType<typeof getApiDb>;
export type MediaAssetRow = typeof mediaAssets.$inferSelect;

export async function getAssetById(
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

export async function ensureUniqueSlug(
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

export function toListItem(
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
export const USAGE_SOURCES: Array<{
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

export interface UsageRef {
  label: string;
  dashboardUrl: string;
  id: string;
  title: string;
  field: string;
  haystack: string;
}

export interface MediaUsage {
  type: string;
  id: string;
  title?: string;
  field: string;
  url: string;
}

export async function loadUsageRefs(db: ApiDb): Promise<UsageRef[]> {
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

export async function findUsageForAssets(
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

export async function findUsage(db: ApiDb, c: Context<Env>, assetId: string): Promise<MediaUsage[]> {
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

export async function updateMetadata(
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

export async function deleteAsset(c: Context<Env>, db: ApiDb, id: string): Promise<void> {
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

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  children: FolderNode[];
  assetCount?: number;
}

export async function listFolders(
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
