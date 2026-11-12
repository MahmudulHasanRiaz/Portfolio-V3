import { NextRequest, NextResponse } from "next/server";
import { createPortalRepositories } from "@repo/portal-pkg";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("portal_session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const repo = createPortalRepositories(dbUrl);
    try {
      const payload = repo.auth.verifyJwt(sessionToken);
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status") || undefined;

      const project = await repo.projects.getById(payload.projectId);
      const clientId = project?.clientId;
      if (!clientId) return NextResponse.json({ error: "No client" }, { status: 400 });

      const result = await repo.deliverables.listByClient(clientId, { status });
      return NextResponse.json(result);
    } finally {
      await repo.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch deliverables" },
      { status: 500 }
    );
  }
}
