import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createProposalsRepositories, ProposalsError } from "@repo/proposals";

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
    const { documents } = createProposalsRepositories(dbUrl);
    const document = await documents.getById(id);
    if (!document) return NextResponse.json({ error: "Proposal document not found" }, { status: 404 });
    return NextResponse.json(document);
  } catch (error) {
    return errorResponse(error, "Failed to fetch proposal document");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { documents } = createProposalsRepositories(dbUrl);
    const deleted = await documents.delete(id);
    if (!deleted) return NextResponse.json({ error: "Proposal document not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Failed to delete proposal document");
  }
}
