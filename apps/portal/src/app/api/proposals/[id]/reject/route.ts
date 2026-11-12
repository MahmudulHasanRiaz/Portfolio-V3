import { NextRequest, NextResponse } from "next/server";
import { createPortalRepositories } from "@repo/portal-pkg";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionToken = request.cookies.get("portal_session_token")?.value;
    if (!sessionToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const repo = createPortalRepositories(dbUrl);
    try {
      const payload = repo.auth.verifyJwt(sessionToken);
      const { id } = await params;
      const { reason } = await request.json();

      if (!reason || !reason.trim()) {
        return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
      }

      const project = await repo.projects.getById(payload.projectId);
      const clientId = project?.clientId;

      const proposal = await repo.proposals.getById(id);
      if (!proposal || proposal.clientId !== clientId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const updated = await repo.proposals.reject(id, reason);
      if (!updated) return NextResponse.json({ error: "Cannot reject. Proposal is not in 'sent' status." }, { status: 400 });

      if (proposal.projectId) {
        await repo.activities.log(proposal.projectId, null, "proposal_rejected", {
          proposalId: id, proposalTitle: proposal.title, reason,
        });
      }

      return NextResponse.json(updated);
    } finally {
      await repo.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reject proposal" },
      { status: 500 }
    );
  }
}
