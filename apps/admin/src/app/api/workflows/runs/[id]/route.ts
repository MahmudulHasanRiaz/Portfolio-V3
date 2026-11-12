import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createWorkflowService } from "@repo/workflows";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { repo } = createWorkflowService(dbUrl);
    const run = await repo.getRun(id);

    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

    const logs = await repo.getLogsByRun(id);
    return NextResponse.json({ run, logs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch run" },
      { status: 500 },
    );
  }
}
