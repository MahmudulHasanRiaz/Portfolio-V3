// Admin revisions routes — Hono port of
// apps/admin/src/app/api/revisions/route.ts and
// apps/admin/src/app/api/revisions/[id]/restore/route.ts:
//   GET  /revisions
//   POST /revisions/:id/restore
//
// Mounted at /api/admin/revisions (this router is mounted at / — see
// routes/admin/index.ts).
//
// Fidelity notes:
// - GET returns RevisionService.listRecent(page, pageSize, entityType)
//   exactly: { items, pagination } with pageSize clamped to 1–50 and
//   page clamped to >= 1; entityType must be one of pages / posts /
//   services / projects / case_studies (400 "Invalid entityType").
// - Restore has NO role list: any authenticated user may restore, but
//   the session must carry an email (401 without one) and the internal
//   `users` id is resolved from that email (authorizeByEmail with no
//   role list) because RevisionService.create writes createdBy into a
//   uuid column. An unresolvable/disabled internal user throws, and —
//   as in the original — that surfaces as a 500, not a 401/403.
// - Restore mirrors RevisionService.restore → ContentService.update:
//   the CURRENT row is snapshotted into content_revisions first
//   (revisionNumber = existing count + 1, createdBy = the restoring
//   internal user), then the target row is updated from the revision's
//   contentSnapshot. The snapshot is applied through the same field
//   allowlists the content router uses (the @repo/validation update
//   schemas are .partial() of the create schemas, so unknown keys —
//   id, createdAt, and anything else — are stripped, exactly as Zod
//   strips them in the original). A missing target row throws
//   "Content not found: <id>" (500, as in the original).
//
// Side effects (wired at cutover via lib/side-effects): ContentService.update
// also (a) indexes / de-indexes the entity in search depending on
// whether it is/was published, (b) dispatches no workflow trigger for
// restores, and (c) purges the public site cache via purgePublicCache.
import { Hono } from "hono";
import { and, count, desc, eq } from "drizzle-orm";
import {
  caseStudies,
  contentRevisions,
  pages,
  posts,
  projects,
  services,
  users,
} from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import { cacheTagsForContentType, deleteSearchEntity, indexSearchEntity, purgePublicCache, searchEntityTypeForContentType, waitUntilOf } from "../../lib/side-effects";

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    PUBLIC_SITE_URL?: string;
    CACHE_INVALIDATE_SECRET?: string;
  };
};

const app = new Hono<Env>();

type Db = ReturnType<typeof getApiDb>;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

const ENTITY_TYPES = ["pages", "posts", "services", "projects", "case_studies"];

// Field allowlists = the @repo/validation create*Schema field lists
// (same lists the content router uses; update schemas are .partial()
// of the create schemas, so Zod strips anything outside these).
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

const RESTORE_FIELDS: Record<string, { table: any; fields: string[] }> = {
  pages: {
    table: pages,
    fields: [...COMMON_FIELDS, "content", "template"],
  },
  posts: {
    table: posts,
    fields: [
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
    fields: [
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
    fields: [
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
    fields: [
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

/** Keep only allowlisted keys present in the snapshot (mirrors Zod
 *  stripping unknown keys; explicit nulls are kept so dates can be
 *  cleared). */
function pickFields(
  snapshot: Record<string, unknown>,
  allowed: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (snapshot[key] !== undefined) out[key] = snapshot[key];
  }
  return out;
}

/** RevisionService.create, re-implemented with direct Drizzle calls. */
async function createRevision(
  db: Db,
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

app.get("/revisions", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const entityType = c.req.query("entityType") ?? undefined;
    if (entityType && !ENTITY_TYPES.includes(entityType)) {
      return c.json({ error: "Invalid entityType" }, 400);
    }
    const page = Math.max(
      1,
      parseInt(c.req.query("page") ?? "1", 10) || 1,
    );
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(c.req.query("pageSize") ?? "20", 10) || 20),
    );
    const db = getApiDb();
    const where = entityType
      ? eq(contentRevisions.entityType, entityType)
      : undefined;
    const [countResult] = await db
      .select({ count: count() })
      .from(contentRevisions)
      .where(where);
    const total = Number(countResult?.count ?? 0);
    const items = await db
      .select()
      .from(contentRevisions)
      .where(where)
      .orderBy(
        desc(contentRevisions.createdAt),
        desc(contentRevisions.revisionNumber),
      )
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
    return c.json(
      { error: errorMessage(err, "Failed to load revisions") },
      500,
    );
  }
});

app.post("/revisions/:id/restore", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user?.email) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const db = getApiDb();
    const [revision] = await db
      .select()
      .from(contentRevisions)
      .where(eq(contentRevisions.id, id))
      .limit(1);
    if (!revision) return c.json({ error: "Revision not found" }, 404);
    const entityType = revision.entityType ?? "";
    if (!ENTITY_TYPES.includes(entityType)) {
      return c.json({ error: "Unsupported entity type" }, 400);
    }
    // RevisionService.create writes createdBy into a uuid column, so
    // the restore must be attributed to the real internal user id
    // (authorizeByEmail with no role list — any authenticated user).
    const [internal] = await db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1);
    if (!internal) throw new Error("User not found in internal registry");
    if (internal.isActive === false) {
      throw new Error("User account is disabled");
    }
    const def = RESTORE_FIELDS[entityType]!;
    const snapshot = revision.contentSnapshot as Record<string, unknown> | null;
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      throw new Error("Revision snapshot is empty");
    }
    const entityId = revision.entityId ?? "";
    const [existing] = await db
      .select()
      .from(def.table)
      .where(eq(def.table.id, entityId))
      .limit(1);
    if (existing) {
      await createRevision(
        db,
        entityType,
        entityId,
        existing as Record<string, unknown>,
        internal.id,
      );
    }
    const [restored] = await db
      .update(def.table)
      .set({
        ...pickFields(snapshot, def.fields),
        updatedAt: new Date(),
      })
      .where(eq(def.table.id, entityId))
      .returning();
    if (!restored) throw new Error(`Content not found: ${entityId}`);
    const searchEntityType = searchEntityTypeForContentType(entityType);
    if (restored.status === "published") {
      void indexSearchEntity(db, searchEntityType, entityId, c.env, waitUntilOf(c));
    } else if (existing?.status === "published") {
      void deleteSearchEntity(db, searchEntityType, entityId, waitUntilOf(c));
    }
    void purgePublicCache(c.env, cacheTagsForContentType(entityType), waitUntilOf(c));
    return c.json({ success: true, content: restored });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to restore revision") },
      500,
    );
  }
});

export default app;
