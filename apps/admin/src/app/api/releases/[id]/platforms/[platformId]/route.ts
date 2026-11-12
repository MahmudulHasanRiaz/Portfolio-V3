import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createArtistRepositories } from "@repo/artist";
import { toCamel } from "@/lib/to-camel";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; platformId: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { platformId } = await params;
    const body = await request.json();
    // Accept the dashboard form's `url` as an alias for `platformUrl`.
    if (body.url !== undefined && body.platformUrl === undefined) {
      body.platformUrl = body.url;
    }
    delete body.url;
    const { platforms } = createArtistRepositories();
    const result = await platforms.update(platformId, body);
    if (!result) return NextResponse.json({ error: "Platform link not found" }, { status: 404 });
    return NextResponse.json(toCamel(result));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update platform link" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; platformId: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { platformId } = await params;
    const { platforms } = createArtistRepositories();
    const deleted = await platforms.delete(platformId);
    if (!deleted) return NextResponse.json({ error: "Platform link not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete platform link" },
      { status: 500 },
    );
  }
}
