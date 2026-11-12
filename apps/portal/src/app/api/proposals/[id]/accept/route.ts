import { NextRequest, NextResponse } from "next/server";
import { createPortalRepositories } from "@repo/portal-pkg";
import { dispatchTrigger } from "@repo/workflows";

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
      const project = await repo.projects.getById(payload.projectId);
      const clientId = project?.clientId;

      const proposal = await repo.proposals.getById(id);
      if (!proposal || proposal.clientId !== clientId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const updated = await repo.proposals.accept(id);
      if (!updated) return NextResponse.json({ error: "Cannot accept. Proposal is not in 'sent' status." }, { status: 400 });

      if (proposal.projectId) {
        await repo.activities.log(proposal.projectId, null, "proposal_accepted", {
          proposalId: id, proposalTitle: proposal.title,
        });
      }

      await dispatchTrigger(dbUrl, "proposal_accepted", id, { ...updated, triggeredBy: clientId });
      return NextResponse.json(updated);
    } finally {
      await repo.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept proposal" },
      { status: 500 }
    );
  }
}
