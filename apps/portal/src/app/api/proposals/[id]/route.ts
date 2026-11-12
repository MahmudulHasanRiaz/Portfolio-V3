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

      const proposal = await repo.proposals.getById(id);
      if (!proposal || proposal.clientId !== clientId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json(proposal);
    } finally {
      await repo.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch proposal" },
      { status: 500 }
    );
  }
}
