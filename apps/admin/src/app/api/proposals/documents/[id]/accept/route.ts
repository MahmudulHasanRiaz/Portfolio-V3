import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createProposalsRepositories, ProposalsError } from "@repo/proposals";
import { dispatchTrigger } from "@repo/workflows";

const dbUrl = process.env.DATABASE_URL!;

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ProposalsError) {
    const status = error.code.endsWith("_NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { documents } = createProposalsRepositories(dbUrl);
    const result = await documents.accept(id);
    if (!result) {
      return NextResponse.json(
        { error: "Document cannot be accepted. Only sent documents can be accepted." },
        { status: 400 },
      );
    }

    // Workflow dispatch is isolated: a workflow failure must never fail
    // the acceptance itself.
    try {
      await dispatchTrigger(dbUrl, "proposal_accepted", id, {
        ...result.document,
        projectId: result.projectId,
        projectCreated: result.projectCreated,
        triggeredBy: session.user.id,
      });
    } catch (err) {
      console.error("[Proposals API] Failed to dispatch proposal_accepted:", err);
    }

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Failed to accept proposal document");
  }
}
