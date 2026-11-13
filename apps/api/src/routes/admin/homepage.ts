// Admin homepage routes — Hono port of apps/admin/src/app/api/homepage/:
//   POST /reorder
//   GET  /sections
//   PATCH /sections/:id
//   POST /sections/:id/toggle
//   POST /versions
//   POST /versions/:id/restore
//
// Mounted at /api/admin/homepage (see routes/admin/index.ts).
//
// Fidelity notes:
// - Response shapes match the Next.js routes exactly: reorder returns
//   { success: true }; sections GET returns { sections, versions } where
//   versions is the first page (5) of homepage_versions, newest first;
//   section PATCH / toggle return { success: true, section };
//   versions POST returns { success: true, version }; version restore
//   returns { success: true, restored } and 404s with "Version not found".
// - The Next.js routes call HomepageService (@repo/cms), which runs over
//   the postgres.js getDb() singleton (TCP). The service logic is
//   re-implemented here with direct Drizzle calls over getApiDb()
//   (Neon HTTP), statement by statement — Neon HTTP does not support
//   db.transaction(), so the multi-statement reorder/restore loops run
//   sequentially, exactly as the service did.
// - versions POST resolves the internal `users` id from the session email
//   (authorizeByEmail with no role list); when it cannot be resolved the
//   createdBy column stays null, exactly as in the original.
// - There is deliberately NO homepage/seed route here: the Next.js
//   homepage/seed route bulk-seeds dummy data (including a DevPulse BD
//   venture the user said to drop) and is NOT ported.
//
// Cache purge (wired at cutover via lib/side-effects): HomepageService
// calls purgePublicCache(["home"]) after reorder, section update,
// toggle, and version restore (when anything was restored).
import { Hono } from "hono";
import { asc, count, desc, eq } from "drizzle-orm";
import {
  homepageSections,
  homepageVersions,
  users,
} from "@repo/database/schema";
import { getApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";
import { purgePublicCache, waitUntilOf } from "../../lib/side-effects";
import { z } from "zod";
import { updateHomepageSectionSchema, uuidSchema } from "@repo/validation";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../lib/validate";

// Local schema: reorder takes a non-empty list of section ids.
const reorderSchema = z.object({ ids: z.array(uuidSchema).min(1) });

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

/** Resolve the internal `users` id for a Better Auth session email
 *  (mirrors authorizeByEmail(email) with no role list). Returns null
 *  when the email is missing, unknown, or the account is disabled —
 *  the versions POST route treats that as "createdBy stays null". */
async function resolveInternalUserId(
  db: Db,
  email: string | undefined | null,
): Promise<string | null> {
  if (!email) return null;
  const [row] = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!row || row.isActive === false) return null;
  return row.id;
}

/** HomepageService.getAllSections: every section, sortOrder ascending. */
async function getAllSections(db: Db) {
  return db
    .select()
    .from(homepageSections)
    .orderBy(asc(homepageSections.sortOrder));
}

/** HomepageService.getVersions(page, pageSize). */
async function getVersions(db: Db, page: number, pageSize: number) {
  const [countResult] = await db
    .select({ count: count() })
    .from(homepageVersions);
  const total = Number(countResult?.count ?? 0);
  const items = await db
    .select()
    .from(homepageVersions)
    .orderBy(desc(homepageVersions.version))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const totalPages = Math.ceil(total / pageSize);
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

// ─── Reorder ─────────────────────────────────────────────────────────────────

app.post("/reorder", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    const v = validateBody(body, reorderSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const db = getApiDb();
    const ids = v.data.ids;
    for (let i = 0; i < ids.length; i++) {
      await db
        .update(homepageSections)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(homepageSections.id, ids[i] as string));
    }
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json({ success: true });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to reorder sections") },
      500,
    );
  }
});

// ─── Sections ────────────────────────────────────────────────────────────────

app.get("/sections", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const sections = await getAllSections(db);
    const versions = await getVersions(db, 1, 5);
    return c.json({ sections, versions: versions.items });
  } catch {
    return c.json({ error: "Failed to load homepage data" }, 500);
  }
});

app.patch("/sections/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) return c.json({ error: "Invalid request body" }, 400);
    // Reuse the shared update schema for the content record shape; the
    // per-section content shape is genuinely ambiguous, so only the
    // record itself is enforced — no per-section schema is invented.
    // Server-managed fields (id, createdAt, updatedAt) are in the
    // partial schema but are never read below, so they cannot be written.
    const v = validateBody(body, updateHomepageSectionSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const content = v.data.content;
    if (!content || typeof content !== "object" || Array.isArray(content)) {
      return c.json({ error: "content must be an object" }, 400);
    }
    const db = getApiDb();
    const [row] = await db
      .update(homepageSections)
      .set({
        content: content as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(homepageSections.id, id))
      .returning();
    if (!row) throw new Error("Section not found");
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json({ success: true, section: row });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to update section") },
      500,
    );
  }
});

app.post("/sections/:id/toggle", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [section] = await db
      .select()
      .from(homepageSections)
      .where(eq(homepageSections.id, id))
      .limit(1);
    if (!section) throw new Error("Section not found");
    const [row] = await db
      .update(homepageSections)
      .set({ isVisible: !section.isVisible, updatedAt: new Date() })
      .where(eq(homepageSections.id, id))
      .returning();
    void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    return c.json({ success: true, section: row });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to toggle section") },
      500,
    );
  }
});

// ─── Versions ────────────────────────────────────────────────────────────────

app.post("/versions", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    // createdBy is a uuid column: resolve the real internal user id;
    // null (column is nullable) when it cannot be resolved.
    let createdBy: string | null = null;
    try {
      createdBy = await resolveInternalUserId(db, user.email);
    } catch {
      createdBy = null;
    }
    const sections = await getAllSections(db);
    const [latest] = await db
      .select({ maxVer: count() })
      .from(homepageVersions);
    const versionNumber = (Number(latest?.maxVer) || 0) + 1;
    const [version] = await db
      .insert(homepageVersions)
      .values({
        version: versionNumber,
        snapshotJson: { sections } as unknown as Record<string, unknown>,
        createdBy,
      })
      .returning();
    return c.json({ success: true, version });
  } catch (err) {
    return c.json(
      { error: errorMessage(err, "Failed to save version") },
      500,
    );
  }
});

app.post("/versions/:id/restore", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [version] = await db
      .select()
      .from(homepageVersions)
      .where(eq(homepageVersions.id, id))
      .limit(1);
    if (!version) throw new Error("Version not found");
    const snapshot = (version.snapshotJson ?? {}) as {
      sections?: Record<string, unknown>[];
    };
    const sections = Array.isArray(snapshot.sections) ? snapshot.sections : [];
    let restored = 0;
    for (const snap of sections) {
      let target: { id: string; sortOrder: number | null } | null = null;
      if (typeof snap.id === "string" && snap.id !== "") {
        const [byId] = await db
          .select()
          .from(homepageSections)
          .where(eq(homepageSections.id, snap.id))
          .limit(1);
        target = byId ?? null;
      }
      if (!target && typeof snap.sectionKey === "string" && snap.sectionKey !== "") {
        const [byKey] = await db
          .select()
          .from(homepageSections)
          .where(eq(homepageSections.sectionKey, snap.sectionKey))
          .limit(1);
        target = byKey ?? null;
      }
      if (!target) continue;
      await db
        .update(homepageSections)
        .set({
          content: (snap.content ?? {}) as Record<string, unknown>,
          isVisible:
            typeof snap.isVisible === "boolean" ? snap.isVisible : true,
          sortOrder:
            typeof snap.sortOrder === "number"
              ? snap.sortOrder
              : (target.sortOrder ?? 0),
          updatedAt: new Date(),
        })
        .where(eq(homepageSections.id, target.id));
      restored++;
    }
    if (restored > 0) {
      void purgePublicCache(c.env, ["home"], waitUntilOf(c));
    }
    return c.json({ success: true, restored });
  } catch (err) {
    if (err instanceof Error && err.message === "Version not found") {
      return c.json({ error: "Version not found" }, 404);
    }
    return c.json(
      { error: errorMessage(err, "Failed to restore version") },
      500,
    );
  }
});

export default app;
