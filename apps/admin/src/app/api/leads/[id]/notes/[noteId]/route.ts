import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createCrmRepositories } from "@repo/crm";

const dbUrl = process.env.DATABASE_URL!;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { noteId } = await params;
    const { note } = await request.json();

    if (!note) {
      return NextResponse.json({ error: "Note content is required" }, { status: 400 });
    }

    const { notes } = createCrmRepositories(dbUrl);
    const result = await notes.update(noteId, note);
    if (!result) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update note" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, noteId } = await params;

    const { notes, activities } = createCrmRepositories(dbUrl);
    const deleted = await notes.delete(noteId);
    if (!deleted) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    await activities.log(id, "note_deleted", "Note deleted from lead", session.user.id, { noteId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete note" },
      { status: 500 },
    );
  }
}
