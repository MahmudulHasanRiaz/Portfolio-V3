import { NextResponse } from "next/server";
import { MediaService, NotFoundError } from "@repo/media";

const mediaService = new MediaService();

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await mediaService.restore(id);
    const asset = await mediaService.getById(id);
    return NextResponse.json({ success: true, data: asset });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore media" },
      { status: 500 },
    );
  }
}
