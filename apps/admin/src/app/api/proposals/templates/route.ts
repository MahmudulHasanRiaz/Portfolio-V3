import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createProposalsRepositories, ProposalsError } from "@repo/proposals";
import { createProposalTemplateSchema } from "@repo/validation";

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
    const type = searchParams.get("type");
    const clientType = searchParams.get("clientType");
    const isActiveParam = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const { templates } = createProposalsRepositories(dbUrl);
    const result = await templates.list({
      type: type ?? undefined,
      clientType: clientType ?? undefined,
      isActive: isActiveParam === null ? undefined : isActiveParam === "true",
      page,
      pageSize,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Failed to fetch proposal templates");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createProposalTemplateSchema.safeParse({ ...body, createdBy: session.user.id });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
    }

    const { templates } = createProposalsRepositories(dbUrl);
    const template = await templates.create(parsed.data as Record<string, unknown>);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create proposal template");
  }
}
