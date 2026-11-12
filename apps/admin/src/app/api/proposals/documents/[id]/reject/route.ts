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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const reason = body?.reason;
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
    }

    const { documents } = createProposalsRepositories(dbUrl);
    const document = await documents.reject(id, reason);
    if (!document) {
      return NextResponse.json(
        { error: "Document cannot be rejected. Only sent documents can be rejected." },
        { status: 400 },
      );
    }
    return NextResponse.json(document);
  } catch (error) {
    return errorResponse(error, "Failed to reject proposal document");
  }
}
