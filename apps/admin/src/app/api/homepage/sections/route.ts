import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { HomepageService } from "@repo/cms";

const service = new HomepageService();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sections = await service.getAllSections();
    const versions = await service.getVersions(1, 5);
    return NextResponse.json({ sections, versions: versions.items });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load homepage data" }, { status: 500 });
  }
}
