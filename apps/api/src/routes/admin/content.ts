// Admin content CRUD — Hono port of apps/admin/src/actions/content.ts
// (listContent / getContentById / createContent / updateContent /
// deleteContent / transitionContent, plus the CategoryService and
// TagService functions from packages/cms).
//
// Mounted at /api/admin/content (see routes/admin/index.ts).
//
// Fidelity notes:
// - Response shapes match the server actions exactly: list returns
//   { items, pagination }, get/create/update/transition return the bare
//   row, delete returns { ok: true } (the action returns void).
// - Drizzle rows are already keyed by the schema's camelCase property
//   names, so no case conversion is applied.
// - Create/update field allowlists below mirror the @repo/validation
//   create* schemas field-for-field (Zod strips unknown keys in the
//   original; the allowlist does the same here). `id` / `createdAt` /
//   `updatedAt` are never taken from the body: ids are DB-generated and
//   updatedAt is stamped server-side, as in ContentService.
// - Delete is a soft-delete to "archived" from ANY status (re-archiving
//   is an error), exactly as in ContentService.delete.
// - Update/delete snapshot the previous row into content_revisions
//   (RevisionService.create), with revisionNumber = existing count + 1.
//
// Side effects (wired at cutover via lib/side-effects): the original
// actions also (a) dispatchTrigger(..., "content_published", ...) when
// a create/update/transition lands on status "published", (b) index /
// de-index the entity via SearchIndexerService, and (c) purge the public
// site cache via purgePublicCache.
//
// Out of scope for this router (they live in the same action file but
// were not requested): set/getContentCategories, set/getContentTags,
// list/create/update/delete FAQ, and list/create/update/delete
// TimelineEvent. Those belong in their own routers.
import { Hono } from "hono";
import { z } from "zod";
import {
  createCaseStudySchema,
  createCategorySchema,
  createPageSchema,
  createPostSchema,
  createProjectSchema,
  createServiceSchema,
  createTagSchema,
  entityStatusSchema,
  updateCaseStudySchema,
  updateCategorySchema,
  updatePageSchema,
  updatePostSchema,
  updateProjectSchema,
  updateServiceSchema,
  updateTagSchema,
  uuidSchema,
} from "@repo/validation";
import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import {
  caseStudies,
  categories,
  contentRevisions,
  pages,
  postCategories,
  posts,
  postTags,
  projects,
  services,
  tags,
} from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  parsePagination,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../lib/validate";
import { cacheTagsForContentType, deleteSearchEntity, dispatchTrigger, indexSearchEntity, purgePublicCache, searchEntityTypeForContentType, waitUntilOf } from "../../lib/side-effects";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    PUBLIC_SITE_URL?: string;
    CACHE_INVALIDATE_SECRET?: string;
  };
};

const app = new Hono<Env>();

// ─── Content types ───────────────────────────────────────────────────────────
// Mirrors packages/cms/src/types.ts (contentTypes). Every type uses
// statusField "status" and authorField "createdBy"; only posts has
// category/tag junction tables (postCategories / postTags).

const BASE_WORKFLOW: Record<string, readonly string[]> = {
  draft: ["published"],
  published: ["archived", "draft"],
  archived: ["draft"],
};

const POST_WORKFLOW: Record<string, readonly string[]> = {
  draft: ["review"],
  review: ["draft", "scheduled", "published"],
  scheduled: ["published", "draft"],
  published: ["archived", "draft"],
  archived: ["draft"],
};

// Field allowlists = the @repo/validation create*Schema field lists.
const COMMON_FIELDS = [
  "title",
  "slug",
  "status",
  "locale",
  "translationGroup",
  "metaTitle",
  "metaDescription",
  "ogImage",
  "createdBy",
];

interface ContentTypeConfig {
  table: any;
  searchFields: string[];
  workflow: Record<string, readonly string[]>;
  allowedFields: string[];
  /** DB NOT NULL slug: pages, projects, services. posts/case_studies allow null. */
  slugRequired: boolean;
}

const CONTENT_TYPES: Record<string, ContentTypeConfig> = {
  pages: {
    table: pages,
    searchFields: ["title", "content"],
    workflow: BASE_WORKFLOW,
    slugRequired: true,
    allowedFields: [...COMMON_FIELDS, "content", "template"],
  },
  posts: {
    table: posts,
    searchFields: ["title", "excerpt", "content"],
    workflow: POST_WORKFLOW,
    slugRequired: false,
    allowedFields: [
      ...COMMON_FIELDS,
      "titleBn",
      "excerpt",
      "excerptBn",
      "content",
      "contentBn",
      "coverImage",
      "thumbnailType",
      "thumbnailUrl",
      "thumbnailVideoUrl",
      "thumbnailAutoplay",
      "videos",
      "galleryImages",
      "isPreview",
      "authorId",
      "isFeatured",
      "publishAt",
      "unpublishAt",
      "canonicalUrl",
      "keywords",
      "indexable",
      "followLinks",
      "archiveAllowed",
      "canonicalOverride",
    ],
  },
  services: {
    table: services,
    searchFields: ["title", "summary", "description"],
    workflow: BASE_WORKFLOW,
    slugRequired: true,
    allowedFields: [
      ...COMMON_FIELDS,
      "titleBn",
      "summary",
      "summaryBn",
      "description",
      "descriptionBn",
      "icon",
      "priceRange",
      "thumbnailType",
      "thumbnailUrl",
      "thumbnailVideoUrl",
      "thumbnailAutoplay",
      "isFeatured",
      "sortOrder",
      "canonicalUrl",
      "keywords",
      "indexable",
      "followLinks",
      "archiveAllowed",
      "canonicalOverride",
    ],
  },
  projects: {
    table: projects,
    searchFields: ["title", "summary", "description", "clientName"],
    workflow: BASE_WORKFLOW,
    slugRequired: true,
    allowedFields: [
      ...COMMON_FIELDS,
      "titleBn",
      "summary",
      "summaryBn",
      "description",
      "descriptionBn",
      "thumbnail",
      "coverImage",
      "thumbnailType",
      "thumbnailUrl",
      "thumbnailVideoUrl",
      "thumbnailAutoplay",
      "videos",
      "galleryImages",
      "isPreview",
      "industry",
      "clientName",
      "projectUrl",
      "startDate",
      "endDate",
      "isFeatured",
      "canonicalUrl",
      "keywords",
      "indexable",
      "followLinks",
      "archiveAllowed",
      "canonicalOverride",
    ],
  },
  case_studies: {
    table: caseStudies,
    searchFields: ["title", "challenge", "strategy", "results"],
    workflow: BASE_WORKFLOW,
    slugRequired: false,
    allowedFields: [
      ...COMMON_FIELDS,
      "projectId",
      "titleBn",
      "challenge",
      "challengeBn",
      "research",
      "researchBn",
      "strategy",
      "strategyBn",
      "results",
      "resultsBn",
      "metrics",
      "thumbnailType",
      "thumbnailUrl",
      "thumbnailVideoUrl",
      "thumbnailAutoplay",
      "videos",
      "galleryImages",
      "isPreview",
      "isFeatured",
      "canonicalUrl",
      "keywords",
    ],
  },
};

// ─── Workflow (mirrors packages/cms/src/workflow.ts) ─────────────────────────

const ACTION_STATUS_MAP: Record<string, string> = {
  publish: "published",
  unpublish: "draft",
  draft: "draft",
  archive: "archived",
  restore: "draft",
  submit: "review",
  approve: "published",
  schedule: "scheduled",
};

function getTargetStatus(action: string): string {
  const status = ACTION_STATUS_MAP[action];
  if (!status) throw new Error(`Unknown workflow action: "${action}"`);
  return status;
}

function validateTransition(
  currentStatus: string,
  targetStatus: string,
  allowedTransitions: Record<string, readonly string[]>,
): void {
  const allowed = allowedTransitions[currentStatus];
  if (!allowed) {
    throw new Error(`No transitions allowed from status "${currentStatus}"`);
  }
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Cannot transition from "${currentStatus}" to "${targetStatus}". ` +
        `Allowed: ${allowed.join(", ")}`,
    );
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────
// Per-type create/update schemas from @repo/validation. The create schemas
// leave `slug` optional, but the route requires it for pages/projects/
// services — that check stays inline in POST (see below).
const CREATE_SCHEMAS: Record<string, z.ZodType<any>> = {
  pages: createPageSchema,
  posts: createPostSchema,
  services: createServiceSchema,
  projects: createProjectSchema,
  case_studies: createCaseStudySchema,
};
const UPDATE_SCHEMAS: Record<string, z.ZodType<any>> = {
  pages: updatePageSchema,
  posts: updatePostSchema,
  services: updateServiceSchema,
  projects: updateProjectSchema,
  case_studies: updateCaseStudySchema,
};

// Local: transition actions (the workflow map above is the source of truth).
const transitionSchema = z.object({
  action: z.enum([
    "publish",
    "unpublish",
    "draft",
    "archive",
    "restore",
    "submit",
    "approve",
    "schedule",
  ]),
});

// Posts use the 5-value workflow status; every other type uses the
// 3-value entity status.
const POST_STATUS_SCHEMA = z.enum([
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
]);

/** Server-managed fields are never client-settable: drop them from
 *  validated data before any DB write. */
function stripServerManaged(data: Record<string, unknown>): void {
  delete data.id;
  delete data.createdBy;
  delete data.createdAt;
  delete data.updatedAt;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

/** Keep only allowlisted keys present in the body (mirrors Zod stripping
 *  unknown keys; explicit nulls are kept so dates can be cleared). */
function pickFields(
  body: Record<string, unknown>,
  allowed: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** RevisionService.create, re-implemented with direct Drizzle calls. */
async function createRevision(
  db: ReturnType<typeof getApiDb>,
  entityType: string,
  entityId: string,
  snapshot: Record<string, unknown>,
  userId: string,
): Promise<void> {
  const [latest] = await db
    .select({ maxRev: count() })
    .from(contentRevisions)
    .where(
      and(
        eq(contentRevisions.entityType, entityType),
        eq(contentRevisions.entityId, entityId),
      ),
    );
  const revisionNumber = (Number(latest?.maxRev) || 0) + 1;
  await db.insert(contentRevisions).values({
    entityType,
    entityId,
    revisionNumber,
    contentSnapshot: snapshot,
    createdBy: userId,
  });
}

async function getContentRow(
  db: ReturnType<typeof getApiDb>,
  def: ContentTypeConfig,
  id: string,
): Promise<Record<string, unknown> | null> {
  const [row] = await db
    .select()
    .from(def.table)
    .where(eq(def.table.id, id))
    .limit(1);
  return (row as Record<string, unknown>) || null;
}

// ─── Categories ──────────────────────────────────────────────────────────────

app.get("/categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const type = c.req.query("type");
    const rows = await db
      .select()
      .from(categories)
      .where(type ? eq(categories.type, type) : undefined)
      .orderBy(asc(categories.name));
    return c.json(rows);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.post("/categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createCategorySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data as Record<string, unknown>;
    stripServerManaged(data);
    if (typeof data.name !== "string" || data.name.trim() === "") {
      return c.json({ error: "name is required" }, 400);
    }
    const db = getApiDb();
    const slug =
      typeof data.slug === "string" && data.slug !== ""
        ? data.slug
        : slugify(data.name);
    const [row] = await db
      .insert(categories)
      .values({
        name: data.name,
        slug,
        description:
          typeof data.description === "string" ? data.description : null,
        type: typeof data.type === "string" ? data.type : null,
      })
      .returning();
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/categories/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateCategorySchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const db = getApiDb();
    const [row] = await db
      .update(categories)
      .set(pickFields(data, ["name", "slug", "description", "type"]))
      .where(eq(categories.id, id))
      .returning();
    if (!row) throw new Error("Category not found");
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.delete("/categories/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    await db.delete(categories).where(eq(categories.id, id));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// ─── Tags ────────────────────────────────────────────────────────────────────

app.get("/tags", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const rows = await db.select().from(tags).orderBy(asc(tags.name));
    return c.json(rows);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.post("/tags", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, createTagSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = v.data as Record<string, unknown>;
    stripServerManaged(data);
    if (typeof data.name !== "string" || data.name.trim() === "") {
      return c.json({ error: "name is required" }, 400);
    }
    const db = getApiDb();
    const slug =
      typeof data.slug === "string" && data.slug !== ""
        ? data.slug
        : slugify(data.name);
    const [row] = await db
      .insert(tags)
      .values({ name: data.name, slug })
      .returning();
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.put("/tags/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, updateTagSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const db = getApiDb();
    const [row] = await db
      .update(tags)
      .set(pickFields(data, ["name", "slug"]))
      .where(eq(tags.id, id))
      .returning();
    if (!row) throw new Error("Tag not found");
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

app.delete("/tags/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    await db.delete(tags).where(eq(tags.id, id));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// ─── Content ─────────────────────────────────────────────────────────────────
// Registered AFTER /categories and /tags so those static segments win
// over the :type param.

// GET /:type — list (ContentService.list)
app.get("/:type", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const type = c.req.param("type");
    const def = CONTENT_TYPES[type];
    if (!def) return c.json({ error: "Unknown content type" }, 404);
    const db = getApiDb();
    const { page, pageSize } = parsePagination(c);
    const status = c.req.query("status") ?? undefined;
    const search = c.req.query("search") ?? undefined;
    const authorId = c.req.query("authorId") ?? undefined;
    const categoryId = c.req.query("categoryId") ?? undefined;
    const tagId = c.req.query("tagId") ?? undefined;
    const sortField = c.req.query("sortField") ?? undefined;
    const sortDir = c.req.query("sortDir") ?? undefined;
    if (status !== undefined) {
      const statusSchema =
        type === "posts" ? POST_STATUS_SCHEMA : entityStatusSchema;
      if (!statusSchema.safeParse(status).success) {
        return c.json({ error: "Invalid status" }, 400);
      }
    }
    if (search !== undefined && search.length > 255) {
      return c.json({ error: "search must be at most 255 characters" }, 400);
    }
    for (const [label, value] of [
      ["authorId", authorId],
      ["categoryId", categoryId],
      ["tagId", tagId],
    ] as const) {
      if (value !== undefined && !uuidSchema.safeParse(value).success) {
        return c.json({ error: `Invalid ${label}` }, 400);
      }
    }
    if (
      sortDir !== undefined &&
      sortDir !== "asc" &&
      sortDir !== "desc"
    ) {
      return c.json({ error: "Invalid sortDir" }, 400);
    }

    const conditions: any[] = [];

    if (status) {
      conditions.push(eq(def.table.status, status));
    }

    if (search && def.searchFields.length > 0) {
      conditions.push(
        or(
          ...def.searchFields.map((f) =>
            ilike(def.table[f], `%${search}%`),
          ),
        ),
      );
    }

    if (authorId) {
      conditions.push(eq(def.table.createdBy, authorId));
    }

    // Only posts has category/tag junction tables.
    if (categoryId && type === "posts") {
      conditions.push(
        inArray(
          posts.id,
          db
            .select({ id: postCategories.postId })
            .from(postCategories)
            .where(eq(postCategories.categoryId, categoryId)),
        ),
      );
    }

    if (tagId && type === "posts") {
      conditions.push(
        inArray(
          posts.id,
          db
            .select({ id: postTags.postId })
            .from(postTags)
            .where(eq(postTags.tagId, tagId)),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: count() })
      .from(def.table)
      .where(where);
    const total = Number(countResult?.count ?? 0);

    const orderField = sortField || "createdAt";
    const orderDir = sortDir || "desc";
    const orderCol = def.table[orderField];
    const orderBy = orderCol
      ? orderDir === "desc"
        ? desc(orderCol)
        : asc(orderCol)
      : desc(def.table.createdAt);

    const items = await db
      .select()
      .from(def.table)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalPages = Math.ceil(total / pageSize);

    return c.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// GET /:type/:id — one item (ContentService.getById)
app.get("/:type/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const def = CONTENT_TYPES[c.req.param("type")];
    if (!def) return c.json({ error: "Unknown content type" }, 404);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const row = await getContentRow(db, def, id);
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST /:type — create (ContentService.create)
app.post("/:type", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const type = c.req.param("type");
    const def = CONTENT_TYPES[type];
    if (!def) return c.json({ error: "Unknown content type" }, 404);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const createSchema = CREATE_SCHEMAS[type];
    if (!createSchema) return c.json({ error: "Unknown content type" }, 404);
    const v = validateBody(body, createSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const fields = pickFields(data, def.allowedFields);
    // slug is DB NOT NULL for pages/projects/services; the original
    // service let the DB throw here — fail fast with a clear 400 instead.
    if (def.slugRequired && (typeof fields.slug !== "string" || fields.slug === "")) {
      return c.json({ error: "slug is required" }, 400);
    }
    const db = getApiDb();
    const [row] = (await db
      .insert(def.table)
      .values({
        ...fields,
        status: fields.status || "draft",
        createdBy: user.id,
      })
      .returning()) as unknown as Record<string, unknown>[];
    const entityType = searchEntityTypeForContentType(type);
    if (row?.status === "published") {
      await dispatchTrigger(db, "content_published", row.id as string, {
        ...row,
        contentType: type,
        triggeredBy: user.id,
      });
      void indexSearchEntity(db, entityType, row.id as string, c.env, waitUntilOf(c));
    }
    void purgePublicCache(c.env, cacheTagsForContentType(type), waitUntilOf(c));
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// PUT /:type/:id — update (ContentService.update)
// NOTE (follow-up decision, left as-is): PUT still allows a direct
// `status` change, bypassing the transition endpoint / workflow. The
// update schemas validate `status` against the type's status enum, but
// no workflow check is applied here.
app.put("/:type/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const type = c.req.param("type");
    const def = CONTENT_TYPES[type];
    if (!def) return c.json({ error: "Unknown content type" }, 404);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const updateSchema = UPDATE_SCHEMAS[type];
    if (!updateSchema) return c.json({ error: "Unknown content type" }, 404);
    const v = validateBody(body, updateSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const data = { ...(v.data as Record<string, unknown>) };
    stripServerManaged(data);
    const db = getApiDb();
    const existing = await getContentRow(db, def, id);
    if (existing) {
      await createRevision(db, type, id, existing, user.id);
    }
    const [row] = await db
      .update(def.table)
      .set({ ...pickFields(data, def.allowedFields), updatedAt: new Date() })
      .where(eq(def.table.id, id))
      .returning();
    if (!row) throw new Error(`Content not found: ${id}`);
    const entityType = searchEntityTypeForContentType(type);
    const wasPublished = existing?.status === "published";
    if (row.status === "published") {
      await dispatchTrigger(db, "content_published", row.id, {
        ...row,
        contentType: type,
        triggeredBy: user.id,
      });
      void indexSearchEntity(db, entityType, row.id, c.env, waitUntilOf(c));
    } else if (wasPublished) {
      void deleteSearchEntity(db, entityType, row.id, waitUntilOf(c));
    }
    void purgePublicCache(c.env, cacheTagsForContentType(type), waitUntilOf(c));
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// DELETE /:type/:id — soft-delete to "archived" (ContentService.delete)
app.delete("/:type/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const type = c.req.param("type");
    const def = CONTENT_TYPES[type];
    if (!def) return c.json({ error: "Unknown content type" }, 404);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const existing = await getContentRow(db, def, id);
    if (!existing) throw new Error(`Content not found: ${id}`);
    const currentStatus = existing.status as string;
    if (currentStatus === "archived") {
      throw new Error(`Content is already archived: ${id}`);
    }
    await createRevision(db, type, id, existing, user.id);
    await db
      .update(def.table)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(def.table.id, id));
    if (currentStatus === "published") {
      void deleteSearchEntity(db, searchEntityTypeForContentType(type), id, waitUntilOf(c));
    }
    void purgePublicCache(c.env, cacheTagsForContentType(type), waitUntilOf(c));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

// POST /:type/:id/transition — status transition (ContentService.transition)
app.post("/:type/:id/transition", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const type = c.req.param("type");
    const def = CONTENT_TYPES[type];
    if (!def) return c.json({ error: "Unknown content type" }, 404);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, transitionSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const action = v.data.action;
    const db = getApiDb();
    const existing = await getContentRow(db, def, id);
    if (!existing) throw new Error(`Content not found: ${id}`);
    const currentStatus = existing.status as string;
    const targetStatus = getTargetStatus(action);
    validateTransition(currentStatus, targetStatus, def.workflow);
    const [row] = await db
      .update(def.table)
      .set({ status: targetStatus, updatedAt: new Date() })
      .where(eq(def.table.id, id))
      .returning();
    if (!row) throw new Error(`Content not found: ${id}`);
    const entityType = searchEntityTypeForContentType(type);
    if (targetStatus === "published") {
      await dispatchTrigger(db, "content_published", row.id, {
        ...row,
        contentType: type,
        action,
        triggeredBy: user.id,
      });
      void indexSearchEntity(db, entityType, row.id, c.env, waitUntilOf(c));
    } else if (currentStatus === "published") {
      void deleteSearchEntity(db, entityType, row.id, waitUntilOf(c));
    }
    void purgePublicCache(c.env, cacheTagsForContentType(type), waitUntilOf(c));
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 500);
  }
});

export default app;
