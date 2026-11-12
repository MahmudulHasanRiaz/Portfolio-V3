import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { HomepageService } from "@repo/cms";

const service = new HomepageService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const result = await service.toggleVisibility(id);
    return NextResponse.json({ success: true, section: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to toggle section" },
      { status: 500 },
    );
  }
}
