import { NextRequest, NextResponse } from "next/server";
import { auth, authorizeByEmail } from "@repo/auth/server";
import { RevisionService, type ContentTypeName } from "@repo/cms";

const ENTITY_TYPES: ContentTypeName[] = ["pages", "posts", "services", "projects", "case_studies"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const revision = await RevisionService.getById(id);
    if (!revision) return NextResponse.json({ error: "Revision not found" }, { status: 404 });
    if (!ENTITY_TYPES.includes(revision.entityType as ContentTypeName)) {
      return NextResponse.json({ error: "Unsupported entity type" }, { status: 400 });
    }

    // RevisionService.create writes createdBy into a uuid column, so the
    // restore must be attributed to the real internal user id.
    const user = await authorizeByEmail(session.user.email);
    const restored = await RevisionService.restore(
      id,
      revision.entityType as ContentTypeName,
      user.id,
    );
    return NextResponse.json({ success: true, content: restored });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore revision" },
      { status: 500 },
    );
  }
}
