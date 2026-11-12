import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { getDb, searchSynonyms } from "@repo/database";
import { eq } from "drizzle-orm";

const db = getDb();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.role || !["admin", "editor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { term, synonyms, isEnabled } = body;

    const updateData: Record<string, unknown> = {};

    if (term !== undefined) {
      if (typeof term !== "string" || term.trim().length === 0) {
        return NextResponse.json(
          { error: "Term must be a non-empty string." },
          { status: 400 }
        );
      }
      updateData.term = term.trim();
    }

    if (synonyms !== undefined) {
      updateData.synonyms = Array.isArray(synonyms)
        ? synonyms.filter((s: unknown) => typeof s === "string" && s.trim().length > 0)
        : [];
    }

    if (isEnabled !== undefined) {
      updateData.isEnabled = Boolean(isEnabled);
    }

    const [updated] = await db
      .update(searchSynonyms)
      .set(updateData)
      .where(eq(searchSynonyms.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Synonym not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ synonym: updated });
  } catch (error) {
    console.error("[Search Synonyms API] Error:", error);
    return NextResponse.json(
      { error: "Failed to update synonym." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: _request.headers });
    if (!session?.user?.role || !["admin", "editor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const [deleted] = await db
      .delete(searchSynonyms)
      .where(eq(searchSynonyms.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Synonym not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Search Synonyms API] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete synonym." },
      { status: 500 }
    );
  }
}
