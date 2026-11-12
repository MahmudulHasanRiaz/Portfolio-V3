import { NextRequest, NextResponse } from "next/server";
import { createPortalRepositories } from "@repo/portal-pkg";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionToken = request.cookies.get("portal_session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const repo = createPortalRepositories(dbUrl);
    try {
      const payload = repo.auth.verifyJwt(sessionToken);
      const { id } = await params;

      const project = await repo.projects.getById(payload.projectId);
      const clientId = project?.clientId;

      const deliverable = await repo.deliverables.getById(id);
      if (!deliverable) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const accessCheck = await repo.projects.getByIdAndClient(deliverable.projectId, clientId || "");
      if (!accessCheck) return NextResponse.json({ error: "Access denied" }, { status: 403 });

      return NextResponse.json(deliverable);
    } finally {
      await repo.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch deliverable" },
      { status: 500 }
    );
  }
}
