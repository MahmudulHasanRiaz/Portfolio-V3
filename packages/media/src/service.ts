import { getDb, mediaAssets, mediaFolders, posts, services, projects, pages, releases, caseStudies, ventures, homepageSections, personProfiles } from "@repo/database";
import { eq, and, isNull, or, ilike, desc, asc, count, ne } from "drizzle-orm";
import { MEDIA_CONFIG } from "./config";
import { MediaError, ValidationError, NotFoundError, StorageError } from "./errors";
import type { UploadOptions, UploadResult, MediaSearchParams, FolderNode, MediaUsage } from "./types";
import * as r2 from "./r2";
import * as imageProcessor from "./image";
import * as validator from "./validator";

// Content tables that can reference a media asset, and the exact columns
// that hold media URLs (read from packages/database/src/schema — media is
// stored as a URL/path string in these columns, never as an asset id).
// jsonb columns (videos / gallery_images / homepage content) are searched
// as serialised text, so an asset is found wherever its path or public URL
// appears inside them.
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

export class MediaService {
  async upload(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    userId: string,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const size = fileBuffer.length;
    const validation = validator.validateFile(fileName, mimeType, size);
    if (!validation.valid) {
      throw new ValidationError("File validation failed", { errors: validation.errors });
    }

    const sanitized = validator.sanitizeFilename(fileName);
    const folder = options.folder || MEDIA_CONFIG.folders.images;
    const key = r2.buildKey(folder as string, sanitized);

    let width: number | undefined;
    let height: number | undefined;
    let variants: Record<string, string> | undefined;

    if (validation.category === "image" && mimeType !== "image/svg+xml" && fileBuffer.length > 0) {
      try {
        const info = await imageProcessor.getImageInfo(fileBuffer);
        width = info.width;
        height = info.height;
      } catch {
      }
    }

    try {
      await r2.uploadFile(key, fileBuffer, mimeType);
    } catch (err) {
      throw new StorageError("Failed to upload file to storage.", { cause: err });
    }

    const isImage = validation.category === "image"
      && mimeType !== "image/svg+xml"
      && options.generateVariants !== false;

    if (isImage && width && height) {
      variants = {};
      try {
        const variantResults = await imageProcessor.generateVariants(fileBuffer);
        for (const v of variantResults) {
          const vKey = imageProcessor.buildVariantKey(key, v.name, v.format);
          const vBuffer = await imageProcessor.compressImage(fileBuffer, v.format as "jpeg" | "webp" | "avif");
          try {
            await r2.uploadFile(vKey, vBuffer, `image/${v.format}`);
          } catch {
          }
          variants[`${v.name}_${v.format}`] = r2.getPublicUrl(vKey);
        }
      } catch {
      }
    }

    const db = getDb();
    // Slug: URL-friendly id derived from the uploader's file name (not the
    // timestamped storage key), made unique across media_assets.
    const slug = await this.ensureUniqueSlug(validator.slugify(fileName) || "file");
    const records = await db
      .insert(mediaAssets)
      .values({
        filename: sanitized,
        originalName: fileName,
        path: key,
        type: mimeType,
        size,
        width,
        height,
        altText: options.altText || null,
        slug,
        folderId: options.folderId || null,
        variants: variants ? (variants as any) : null,
        uploadedBy: userId,
      })
      .returning();

    const record = records[0]!;

    return {
      id: record.id,
      filename: record.filename || "",
      originalName: record.originalName || "",
      path: record.path || "",
      type: record.type || "",
      category: validation.category || "document",
      size: record.size || 0,
      width: record.width || undefined,
      height: record.height || undefined,
      variants: record.variants as Record<string, string> | undefined,
      url: r2.getPublicUrl(key),
      slug: record.slug || undefined,
    };
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    const asset = await this.getById(id);

    if (asset.path) {
      try {
        await r2.deleteFile(asset.path);
        if (asset.variants) {
          const variantUrls = Object.values(asset.variants as Record<string, string>);
          for (const url of variantUrls) {
            try {
              const urlObj = new URL(url);
              const key = urlObj.pathname.replace(/^\//, "");
              await r2.deleteFile(key);
            } catch {
            }
          }
        }
      } catch (err) {
        throw new StorageError("Failed to delete file from storage.", { cause: err });
      }
    }

    await db
      .update(mediaAssets)
      .set({ deletedAt: new Date() })
      .where(eq(mediaAssets.id, id));
  }

  async hardDelete(id: string): Promise<void> {
    const db = getDb();
    const asset = await this.getById(id);

    if (asset.path) {
      try {
        await r2.deleteFile(asset.path);
      } catch {
      }
    }

    await db
      .delete(mediaAssets)
      .where(eq(mediaAssets.id, id));
  }

  async restore(id: string): Promise<void> {
    const db = getDb();
    await db
      .update(mediaAssets)
      .set({ deletedAt: null })
      .where(eq(mediaAssets.id, id));
  }

  /** First free slug for `base` ("hero", "hero-2", "hero-3", …). */
  async ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
    const db = getDb();
    const clean = validator.slugify(base) || "file";
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

  async updateMetadata(
    id: string,
    data: { altText?: string; folderId?: string | null; originalName?: string; filename?: string; slug?: string },
  ): Promise<void> {
    const db = getDb();
    const asset = await this.getById(id);

    // Rename = the display name (originalName). `filename` is accepted as an
    // alias for the same display name. The stored filename / R2 key is
    // deliberately NOT renamed: content rows reference the public URL, so
    // changing the key would silently break every attachment.
    const displayName = data.originalName ?? data.filename;
    const nextName = displayName !== undefined ? displayName.trim() : asset.originalName;
    if (displayName !== undefined && !nextName) {
      throw new ValidationError("File name cannot be empty.");
    }

    // Slug: validate format + uniqueness; empty string means "auto-suggest
    // from the (new) file name". Assets without a slug get one on edit.
    let nextSlug: string | undefined;
    if (data.slug !== undefined) {
      const raw = data.slug.trim();
      if (raw === "") {
        nextSlug = await this.ensureUniqueSlug(validator.slugify(nextName || asset.filename || "file"), id);
      } else {
        if (!validator.isValidSlug(raw)) {
          throw new ValidationError("Slug may only contain lowercase letters, numbers and single hyphens.");
        }
        const [clash] = await db
          .select({ id: mediaAssets.id })
          .from(mediaAssets)
          .where(and(eq(mediaAssets.slug, raw), ne(mediaAssets.id, id)))
          .limit(1);
        if (clash) {
          throw new MediaError(`Slug "${raw}" is already used by another media file.`, "SLUG_CONFLICT", 409);
        }
        nextSlug = raw;
      }
    } else if (!asset.slug) {
      nextSlug = await this.ensureUniqueSlug(validator.slugify(nextName || asset.filename || "file"), id);
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

  async list(params: MediaSearchParams = {}) {
    const db = getDb();
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [];
    if (!params.includeDeleted) {
      conditions.push(isNull(mediaAssets.deletedAt));
    }

    if (params.folderId) {
      conditions.push(eq(mediaAssets.folderId, params.folderId));
    }

    if (params.type) {
      // The UI sends a prefix ("image/", "video/") for categories — an
      // exact match on "image/" would never match "image/jpeg".
      conditions.push(
        params.type.endsWith("/")
          ? ilike(mediaAssets.type, `${params.type}%`)
          : eq(mediaAssets.type, params.type),
      );
    }

    if (params.uploadedBy) {
      conditions.push(eq(mediaAssets.uploadedBy, params.uploadedBy));
    }

    if (params.query) {
      conditions.push(
        or(
          ilike(mediaAssets.originalName, `%${params.query}%`),
          ilike(mediaAssets.altText, `%${params.query}%`),
          ilike(mediaAssets.filename, `%${params.query}%`),
          ilike(mediaAssets.slug, `%${params.query}%`),
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
    const sortColumn = sortColumnMap[params.sortBy || ""] || mediaAssets.createdAt;
    const orderBy = params.sortDir === "asc" ? asc(sortColumn) : desc(sortColumn);

    const toItem = (item: typeof mediaAssets.$inferSelect, usage?: MediaUsage[]) => ({
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
      url: item.path ? r2.getPublicUrl(item.path) : "",
      ...(usage !== undefined
        ? { attachedCount: usage.length, attachedTo: usage.slice(0, 5) }
        : {}),
    });

    // Attachment filter / usage enrichment needs the real attachment state,
    // which is computed from content rows — so load the matching rows,
    // compute usage once, then filter + paginate in memory. The plain path
    // keeps the fast SQL count + page query.
    if (params.attached !== undefined || params.includeUsage) {
      const rows = await db.select().from(mediaAssets).where(where).orderBy(orderBy);
      const usageById = await this.findUsageForAssets(
        rows as Array<{ id: string; path?: string | null; variants?: Record<string, string> | null }>,
      );
      let filtered = rows;
      if (params.attached !== undefined) {
        filtered = rows.filter((r) =>
          params.attached ? (usageById.get(r.id)?.length || 0) > 0 : (usageById.get(r.id)?.length || 0) === 0,
        );
      }
      const total = filtered.length;
      const pageRows = filtered.slice(offset, offset + pageSize);
      return {
        items: pageRows.map((item) => toItem(item, usageById.get(item.id) || [])),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNextPage: page * pageSize < total,
          hasPreviousPage: page > 1,
        },
      };
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

    return {
      items: items.map((item) => toItem(item)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page * pageSize < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getById(id: string) {
    const db = getDb();
    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .limit(1);

    if (!asset) throw new NotFoundError("MediaAsset", id);

    return {
      ...asset,
      url: asset.path ? r2.getPublicUrl(asset.path) : "",
    };
  }

  // ─── Folder Management ───────────────────────────────────────────

  async createFolder(name: string, parentId?: string): Promise<FolderNode> {
    const db = getDb();
    let folderPath = MEDIA_CONFIG.folders.base;

    if (parentId) {
      const [parent] = await db
        .select()
        .from(mediaFolders)
        .where(eq(mediaFolders.id, parentId))
        .limit(1);
      if (parent) {
        folderPath = `${parent.path}/${name}`;
      }
    } else {
      folderPath = `${MEDIA_CONFIG.folders.base}/${name}`;
    }

    const folders = await db
      .insert(mediaFolders)
      .values({
        name,
        parentId: parentId || null,
        path: folderPath,
      })
      .returning();

    const created = folders[0]!;

    return {
      id: created.id,
      name: created.name || "",
      path: created.path || "",
      parentId: created.parentId,
      children: [],
    };
  }

  async listFolders(parentId?: string | null): Promise<FolderNode[]> {
    const db = getDb();
    const where = parentId
      ? eq(mediaFolders.parentId, parentId)
      : isNull(mediaFolders.parentId);

    const folders = await db
      .select()
      .from(mediaFolders)
      .where(where);

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

      const children = await this.listFolders(f.id);
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

  async getFolderTree(): Promise<FolderNode[]> {
    return this.listFolders(null);
  }

  async renameFolder(id: string, newName: string): Promise<void> {
    const db = getDb();
    const [folder] = await db
      .select()
      .from(mediaFolders)
      .where(eq(mediaFolders.id, id))
      .limit(1);

    if (!folder) throw new NotFoundError("MediaFolder", id);

    const parentPath = folder.parentId
      ? (await db.select({ path: mediaFolders.path }).from(mediaFolders).where(eq(mediaFolders.id, folder.parentId)).limit(1))[0]?.path
      : null;

    const basePath = parentPath || MEDIA_CONFIG.folders.base;
    const newPath = `${basePath}/${newName}`;

    await db
      .update(mediaFolders)
      .set({ name: newName, path: newPath })
      .where(eq(mediaFolders.id, id));
  }

  async deleteFolder(id: string): Promise<void> {
    const db = getDb();
    const children = await db
      .select()
      .from(mediaFolders)
      .where(eq(mediaFolders.parentId, id));

    if (children.length > 0) {
      throw new MediaError("Cannot delete folder with subfolders.", "FOLDER_HAS_CHILDREN", 400);
    }

    const [assetCount] = await db
      .select({ count: count() })
      .from(mediaAssets)
      .where(eq(mediaAssets.folderId, id));

    if (Number(assetCount?.count || 0) > 0) {
      throw new MediaError("Cannot delete folder with assets.", "FOLDER_HAS_ASSETS", 400);
    }

    await db.delete(mediaFolders).where(eq(mediaFolders.id, id));
  }

  // ─── Usage Tracking ─────────────────────────────────────────────
  // Attachment = a content row whose media field contains this asset's
  // storage path or public URL. Media is stored as a URL/path string in the
  // content tables (never as an asset id), so the old equality check against
  // the asset id could never match anything. Content tables are small, so
  // the reference rows are loaded once per call and matched in memory —
  // one query per table, not one per asset.

  private async loadUsageRefs(): Promise<Array<{ label: string; dashboardUrl: string; id: string; title: string; field: string; haystack: string }>> {
    const db = getDb();
    const refs: Array<{ label: string; dashboardUrl: string; id: string; title: string; field: string; haystack: string }> = [];

    for (const source of USAGE_SOURCES) {
      let rows: any[];
      try {
        rows = await db.select().from(source.table);
      } catch {
        continue;
      }
      for (const row of rows) {
        for (const field of source.fields) {
          const value = row[field];
          if (value === null || value === undefined || value === "") continue;
          const haystack = typeof value === "string" ? value : JSON.stringify(value);
          if (!haystack || haystack === "[]" || haystack === "{}" || haystack === '""') continue;
          refs.push({
            label: source.label,
            dashboardUrl: source.dashboardUrl,
            id: row.id,
            title: row[source.titleField] || row.id,
            field,
            haystack,
          });
        }
      }
    }
    return refs;
  }

  /** Usage (attached-to list) for many assets at once, keyed by asset id. */
  async findUsageForAssets(
    assets: Array<{ id: string; path?: string | null; variants?: Record<string, string> | null }>,
  ): Promise<Map<string, MediaUsage[]>> {
    const result = new Map<string, MediaUsage[]>();
    for (const a of assets) result.set(a.id, []);
    if (assets.length === 0) return result;

    const refs = await this.loadUsageRefs();
    for (const asset of assets) {
      const needles = [asset.path, asset.path ? r2.getPublicUrl(asset.path) : null]
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

  async findUsage(assetId: string): Promise<MediaUsage[]> {
    const asset = await this.getById(assetId);
    const map = await this.findUsageForAssets([
      { id: asset.id, path: asset.path, variants: asset.variants as Record<string, string> | null },
    ]);
    return map.get(assetId) || [];
  }
}
