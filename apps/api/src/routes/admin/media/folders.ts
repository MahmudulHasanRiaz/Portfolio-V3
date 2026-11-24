// Admin media library — folder routes (split from media.ts, move-only).
// Routes: GET /folders, POST /folders, GET /folders/:id,
// PUT /folders/:id, PATCH /folders/:id, DELETE /folders/:id.
// Shared helpers live in ./helpers.ts; item routes in ./items.ts.
import { Hono } from "hono";
import type { Context } from "hono";
import { count, eq } from "drizzle-orm";
import { mediaAssets, mediaFolders } from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  createMediaFolderSchema,
  updateMediaFolderSchema,
} from "@repo/validation";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import {
  ensureUnorganizedFolders,
  getOrCreateUnorganized,
  listFolders,
  MediaError,
  NotFoundError,
  R2_FOLDERS,
  UNORGANIZED_FOLDER_NAME,
  type ApiDb,
  type Env,
} from "./helpers";

const app = new Hono<Env>();

// ─── Folders ─────────────────────────────────────────────────────────────────
// Registered BEFORE /:id so the static "folders" segment wins over the
// :id param (same convention as routes/admin/content.ts).

app.get("/folders", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    // Backfill: every existing folder gets its default "Unorganized"
    // child when it does not have one yet (idempotent; moves no files).
    await ensureUnorganizedFolders(db);
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
    const name = data.name.trim();
    if (!name) {
      return c.json({ error: "Folder name is required" }, 400);
    }
    const db = getApiDb();
    const parentId = data.parentId;
    let folderPath: string;
    if (parentId) {
      // A parentId that names no folder must fail loudly: the old code
      // silently fell back to the "uploads" base path, creating a folder
      // whose stored path had no name and whose parent did not exist.
      const [parent] = await db
        .select()
        .from(mediaFolders)
        .where(eq(mediaFolders.id, parentId))
        .limit(1);
      if (!parent) {
        return c.json({ error: "Parent folder not found" }, 400);
      }
      folderPath = `${parent.path}/${name}`;
    } else {
      folderPath = `${R2_FOLDERS.base}/${name}`;
    }
    const [created] = await db
      .insert(mediaFolders)
      .values({
        name,
        parentId: parentId || null,
        path: folderPath,
      })
      .returning();
    if (!created) throw new Error("Failed to create folder");
    // Every folder gets its default "Unorganized" bucket at birth, so
    // unsorted files always have somewhere to land. Best-effort: if
    // this insert fails, the GET /folders backfill creates the bucket
    // on the next tree read, so a failure here must not fail the 201.
    // (getOrCreateUnorganized skips when the new folder itself is named
    // "Unorganized" — never nest the bucket inside itself.)
    try {
      await getOrCreateUnorganized(db, created.id);
    } catch {
      // The backfill covers it; the folder itself was created fine.
    }
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

// Keep descendant folder paths consistent after a rename: without this,
// renaming a parent leaves every child pointing at the old prefix, so a
// deep tree's stored paths go stale the moment a folder above it moves.
async function repathDescendants(
  db: ApiDb,
  folderId: string,
  folderPath: string,
): Promise<void> {
  const children = await db
    .select()
    .from(mediaFolders)
    .where(eq(mediaFolders.parentId, folderId));
  for (const child of children) {
    const childPath = `${folderPath}/${child.name || ""}`;
    await db
      .update(mediaFolders)
      .set({ path: childPath })
      .where(eq(mediaFolders.id, child.id));
    await repathDescendants(db, child.id, childPath);
  }
}

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
    const name = data.name?.trim();
    if (!name) {
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
    const newPath = `${basePath}/${name}`;
    await db
      .update(mediaFolders)
      .set({ name, path: newPath })
      .where(eq(mediaFolders.id, id));
    await repathDescendants(db, id, newPath);
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
    // The default "Unorganized" bucket is an implementation detail, not
    // a user folder: a folder whose only children are EMPTY "Unorganized"
    // buckets can still be deleted — the buckets go with it. Any other
    // child, or a bucket holding files or subfolders, still blocks the
    // delete. All checks run before any delete, so a failed delete never
    // leaves a half-removed bucket behind.
    const buckets = children.filter(
      (ch) => (ch.name || "").trim() === UNORGANIZED_FOLDER_NAME,
    );
    const realChildren = children.filter(
      (ch) => (ch.name || "").trim() !== UNORGANIZED_FOLDER_NAME,
    );
    if (realChildren.length > 0) {
      throw new MediaError(
        "Cannot delete folder with subfolders.",
        "FOLDER_HAS_CHILDREN",
        400,
      );
    }
    for (const bucket of buckets) {
      const grandchildren = await db
        .select({ id: mediaFolders.id })
        .from(mediaFolders)
        .where(eq(mediaFolders.parentId, bucket.id));
      if (grandchildren.length > 0) {
        throw new MediaError(
          "Cannot delete folder with subfolders.",
          "FOLDER_HAS_CHILDREN",
          400,
        );
      }
      const [bucketAssets] = await db
        .select({ count: count() })
        .from(mediaAssets)
        .where(eq(mediaAssets.folderId, bucket.id));
      if (Number(bucketAssets?.count || 0) > 0) {
        throw new MediaError(
          "Cannot delete folder with assets.",
          "FOLDER_HAS_ASSETS",
          400,
        );
      }
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
    for (const bucket of buckets) {
      await db.delete(mediaFolders).where(eq(mediaFolders.id, bucket.id));
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

export default app;
