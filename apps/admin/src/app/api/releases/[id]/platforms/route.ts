import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createArtistRepositories } from "@repo/artist";
import { toCamel } from "@/lib/to-camel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { platforms } = createArtistRepositories();
    const result = await platforms.list(id);
    return NextResponse.json(toCamel(result));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch platforms" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    // The dashboard form sends `url`; the repository column is platform_url.
    const platformUrl = body.platformUrl ?? body.url;
    const { platforms } = createArtistRepositories();
    const result = await platforms.create(id, body.platformName, platformUrl);
    return NextResponse.json(toCamel(result), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create platform link" },
      { status: 500 },
    );
  }
}
