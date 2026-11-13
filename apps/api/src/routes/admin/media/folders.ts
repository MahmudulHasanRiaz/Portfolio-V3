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
  listFolders,
  MediaError,
  NotFoundError,
  R2_FOLDERS,
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

export default app;
