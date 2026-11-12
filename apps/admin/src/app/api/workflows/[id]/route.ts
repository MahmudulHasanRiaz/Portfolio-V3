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
    const workflow = await repo.getWorkflow(id);

    if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    return NextResponse.json(workflow);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch workflow" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { repo } = createWorkflowService(dbUrl);
    const updated = await repo.updateWorkflow(id, body);

    if (!updated) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update workflow" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { repo } = createWorkflowService(dbUrl);
    const deleted = await repo.deleteWorkflow(id);

    if (!deleted) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete workflow" },
      { status: 500 },
    );
  }
}
