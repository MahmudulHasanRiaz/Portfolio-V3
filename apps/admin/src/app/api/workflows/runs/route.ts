import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createWorkflowService } from "@repo/workflows";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const workflowId = searchParams.get("workflowId");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const { repo } = createWorkflowService(dbUrl);
    const result = await repo.listRuns({
      status: status ?? undefined,
      workflowId: workflowId ?? undefined,
      page,
      pageSize,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch workflow runs" },
      { status: 500 },
    );
  }
}
