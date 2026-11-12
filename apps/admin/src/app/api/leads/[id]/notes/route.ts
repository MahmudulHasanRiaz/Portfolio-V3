import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createCrmRepositories } from "@repo/crm";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { notes } = createCrmRepositories(dbUrl);
    const result = await notes.getByLeadId(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { note, isInternal } = await request.json();

    if (!note) {
      return NextResponse.json({ error: "Note content is required" }, { status: 400 });
    }

    const { notes, activities } = createCrmRepositories(dbUrl);
    const result = await notes.create(id, note, session.user.id, isInternal ?? true);
    await activities.log(id, "note_added", "Note added to lead", session.user.id, { isInternal: isInternal ?? true });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add note" },
      { status: 500 },
    );
  }
}
