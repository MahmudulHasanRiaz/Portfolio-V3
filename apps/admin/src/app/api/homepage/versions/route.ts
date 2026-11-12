import { NextRequest, NextResponse } from "next/server";
import { auth, authorizeByEmail } from "@repo/auth/server";
import { HomepageService } from "@repo/cms";

const service = new HomepageService();

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // createdBy is a uuid column: the old hardcoded "system" string was not
    // a uuid, so every save failed in Postgres and the UI silently ignored
    // it. Resolve the real internal user id; null (column is nullable)
    // when it cannot be resolved.
    let createdBy: string | null = null;
    if (session.user.email) {
      try {
        const user = await authorizeByEmail(session.user.email);
        createdBy = user.id;
      } catch {
        createdBy = null;
      }
    }

    const version = await service.createVersion(createdBy);
    return NextResponse.json({ success: true, version });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save version" },
      { status: 500 },
    );
  }
}
