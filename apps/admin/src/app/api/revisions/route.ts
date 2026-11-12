import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { RevisionService } from "@repo/cms";

const ENTITY_TYPES = ["pages", "posts", "services", "projects", "case_studies"];

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") ?? undefined;
    if (entityType && !ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
    }
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));

    const result = await RevisionService.listRecent(page, pageSize, entityType);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load revisions" },
      { status: 500 },
    );
  }
}
