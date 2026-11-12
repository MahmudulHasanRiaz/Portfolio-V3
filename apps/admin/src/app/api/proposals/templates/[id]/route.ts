import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createProposalsRepositories, ProposalsError } from "@repo/proposals";
import { updateProposalTemplateSchema } from "@repo/validation";

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { templates } = createProposalsRepositories(dbUrl);
    const template = await templates.getById(id);
    if (!template) return NextResponse.json({ error: "Proposal template not found" }, { status: 404 });
    return NextResponse.json(template);
  } catch (error) {
    return errorResponse(error, "Failed to fetch proposal template");
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = updateProposalTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
    }

    const { templates } = createProposalsRepositories(dbUrl);
    const updated = await templates.update(id, parsed.data as Record<string, unknown>);
    if (!updated) return NextResponse.json({ error: "Proposal template not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error, "Failed to update proposal template");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { templates } = createProposalsRepositories(dbUrl);
    const deleted = await templates.delete(id);
    if (!deleted) return NextResponse.json({ error: "Proposal template not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete proposal template");
  }
}
