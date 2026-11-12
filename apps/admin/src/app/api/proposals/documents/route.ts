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

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const projectId = searchParams.get("projectId");
    const templateId = searchParams.get("templateId");
    const statusParam = searchParams.get("status");
    const latestOnly = searchParams.get("latestOnly") === "true";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const { documents } = createProposalsRepositories(dbUrl);
    const result = await documents.list({
      clientId: clientId ?? undefined,
      projectId: projectId ?? undefined,
      templateId: templateId ?? undefined,
      status: statusParam ? statusParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      latestOnly,
      page,
      pageSize,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Failed to fetch proposal documents");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { templateId, projectId, clientId, variables } = body ?? {};

    if (!templateId || typeof templateId !== "string") {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 });
    }
    if (variables !== undefined && (typeof variables !== "object" || variables === null || Array.isArray(variables))) {
      return NextResponse.json({ error: "variables must be an object of key/value pairs" }, { status: 400 });
    }

    const { documents } = createProposalsRepositories(dbUrl);
    const document = await documents.generate({
      templateId,
      projectId: projectId ?? undefined,
      clientId: clientId ?? undefined,
      variables: (variables as Record<string, string>) ?? {},
      createdBy: session.user.id,
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to generate proposal document");
  }
}
