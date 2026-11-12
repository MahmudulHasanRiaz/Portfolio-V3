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
    const body = await request.json().catch(() => ({}));
    const { variables, resolvedContent } = body ?? {};

    if (variables !== undefined && (typeof variables !== "object" || variables === null || Array.isArray(variables))) {
      return NextResponse.json({ error: "variables must be an object of key/value pairs" }, { status: 400 });
    }
    if (resolvedContent !== undefined && typeof resolvedContent !== "string") {
      return NextResponse.json({ error: "resolvedContent must be a string" }, { status: 400 });
    }

    const { documents } = createProposalsRepositories(dbUrl);
    const document = await documents.createNewVersion(id, {
      variables: variables as Record<string, string> | undefined,
      resolvedContent: resolvedContent as string | undefined,
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create proposal document version");
  }
}
