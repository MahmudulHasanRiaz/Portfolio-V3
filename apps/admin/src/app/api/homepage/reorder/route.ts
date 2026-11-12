import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { HomepageService } from "@repo/cms";

const service = new HomepageService();

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!Array.isArray(body.ids)) {
      return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
    }
    await service.reorder(body.ids);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reorder sections" },
      { status: 500 },
    );
  }
}
