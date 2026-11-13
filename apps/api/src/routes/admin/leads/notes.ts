// Admin lead notes — moved verbatim from routes/admin/leads.ts.
// Hono port of the Next.js admin REST routes under
// apps/admin/src/app/api/leads/[id]/notes/route.ts and
// [id]/notes/[noteId]/route.ts.
//
// Mounted at /api/admin/leads (see routes/admin/index.ts).
import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import {
  createLeadNoteSchema,
  updateLeadNoteSchema,
} from "@repo/validation";
import { leadNotes } from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  readJsonBody,
  uuidParam,
  validateBody,
} from "../../../lib/validate";
import { Env, errorMessage, logActivity } from "./helpers";

const app = new Hono<Env>();

// POST /:id/notes: the shared create schema minus leadId / createdBy
// (leadId comes from the path, createdBy from the session).
const createLeadNoteLocalSchema = createLeadNoteSchema.omit({
  leadId: true,
  createdBy: true,
});

// PATCH /:id/notes/:noteId: the shared update schema minus the
// server-managed fields.
const updateLeadNoteLocalSchema = updateLeadNoteSchema.omit({
  id: true,
  leadId: true,
  createdBy: true,
  createdAt: true,
});

// ─── Notes ───────────────────────────────────────────────────────────────────

// GET /:id/notes — notes, newest first (NoteRepository.getByLeadId).
app.get("/:id/notes", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const rows = await db
      .select()
      .from(leadNotes)
      .where(eq(leadNotes.leadId, id))
      .orderBy(desc(leadNotes.createdAt));
    return c.json(rows);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to fetch notes") }, 500);
  }
});

// POST /:id/notes — add a note + activity log.
app.post("/:id/notes", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const v = validateBody(body, createLeadNoteLocalSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    // A non-string note (number/object) now 400s in the schema above;
    // an empty string keeps the old "Note content is required" 400.
    const { note, isInternal } = v.data;
    if (!note) {
      return c.json({ error: "Note content is required" }, 400);
    }
    const db = getApiDb();
    const [row] = await db
      .insert(leadNotes)
      .values({
        leadId: id,
        note,
        isInternal: isInternal ?? true,
        createdBy: user.id,
      })
      .returning();
    if (!row) return c.json({ error: "Failed to add note" }, 500);
    await logActivity(db, id, "note_added", "Note added to lead", user.id, {
      isInternal: isInternal ?? true,
    });
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to add note") }, 500);
  }
});

// PATCH /:id/notes/:noteId — update a note (NoteRepository.update).
app.patch("/:id/notes/:noteId", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const noteId = uuidParam(c, "noteId");
    if (!noteId) return invalidParam(c, "noteId");
    const v = validateBody(body, updateLeadNoteLocalSchema);
    if ("error" in v) return c.json({ error: v.error }, 400);
    const { note } = v.data;
    if (!note) {
      return c.json({ error: "Note content is required" }, 400);
    }
    const db = getApiDb();
    const [row] = await db
      .update(leadNotes)
      .set({ note })
      .where(eq(leadNotes.id, noteId))
      .returning();
    if (!row) return c.json({ error: "Note not found" }, 404);
    return c.json(row);
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to update note") }, 500);
  }
});

// DELETE /:id/notes/:noteId — delete a note + activity log.
app.delete("/:id/notes/:noteId", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const noteId = uuidParam(c, "noteId");
    if (!noteId) return invalidParam(c, "noteId");
    const db = getApiDb();
    const [deleted] = await db
      .delete(leadNotes)
      .where(eq(leadNotes.id, noteId))
      .returning({ id: leadNotes.id });
    if (!deleted) return c.json({ error: "Note not found" }, 404);
    await logActivity(db, id, "note_deleted", "Note deleted from lead", user.id, {
      noteId,
    });
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: errorMessage(err, "Failed to delete note") }, 500);
  }
});

export default app;
