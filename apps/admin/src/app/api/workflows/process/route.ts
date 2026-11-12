import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createWorkflowService } from "@repo/workflows";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { worker } = createWorkflowService(dbUrl);
    const result = await worker.processNext();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process workflow" },
      { status: 500 },
    );
  }
}
