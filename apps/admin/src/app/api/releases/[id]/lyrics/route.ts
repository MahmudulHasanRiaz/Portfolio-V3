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
    const { lyrics } = createArtistRepositories();
    const result = await lyrics.getByReleaseId(id);
    return NextResponse.json(toCamel(result ?? {}));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch lyrics" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    // The dashboard form sends `language`; the repository expects
    // `lyricsLanguage`.
    if (body.language !== undefined && body.lyricsLanguage === undefined) {
      body.lyricsLanguage = body.language;
    }
    delete body.language;
    const { lyrics } = createArtistRepositories();
    const result = await lyrics.upsert(id, body);
    return NextResponse.json(toCamel(result));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save lyrics" },
      { status: 500 },
    );
  }
}
