import { NextResponse } from "next/server";
import { MediaService, MediaError } from "@repo/media";

const mediaService = new MediaService();

export async function GET() {
  try {
    const folders = await mediaService.getFolderTree();
    return NextResponse.json({ success: true, data: folders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch folders" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    const folder = await mediaService.createFolder(body.name, body.parentId || undefined);
    return NextResponse.json({ success: true, data: folder }, { status: 201 });
  } catch (error) {
    if (error instanceof MediaError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create folder" },
      { status: 500 },
    );
  }
}
