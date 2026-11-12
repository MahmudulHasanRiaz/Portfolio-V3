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
    const { videos } = createArtistRepositories();
    const result = await videos.list(id);
    return NextResponse.json(toCamel(result));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch videos" },
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
    // The dashboard form sends `url`; the repository expects `videoUrl`.
    if (body.url !== undefined && body.videoUrl === undefined) {
      body.videoUrl = body.url;
    }
    delete body.url;
    const { videos } = createArtistRepositories();
    const result = await videos.create(id, body);
    return NextResponse.json(toCamel(result), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create video link" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params: _params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");
    if (!videoId) return NextResponse.json({ error: "videoId query param required" }, { status: 400 });

    const { videos } = createArtistRepositories();
    const deleted = await videos.delete(videoId);
    if (!deleted) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete video link" },
      { status: 500 },
    );
  }
}
