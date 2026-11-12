import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { runHomepageSeed } from "@/lib/homepage-seed";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const report = await runHomepageSeed();
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed homepage content" },
      { status: 500 },
    );
  }
}
