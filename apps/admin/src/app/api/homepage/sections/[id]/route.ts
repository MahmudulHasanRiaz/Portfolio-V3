import { auth } from "@repo/auth/server";
import { HomepageService } from "@repo/cms";
import { NextRequest, NextResponse } from "next/server";

const service = new HomepageService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const content = body?.content;
    if (!content || typeof content !== "object" || Array.isArray(content)) {
      return NextResponse.json({ error: "content must be an object" }, { status: 400 });
    }
    const result = await service.updateSection(id, { content });
    return NextResponse.json({ success: true, section: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update section" },
      { status: 500 },
    );
  }
}
