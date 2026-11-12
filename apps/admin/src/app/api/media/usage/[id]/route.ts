import { NextResponse } from "next/server";
import { MediaService, NotFoundError } from "@repo/media";

const mediaService = new MediaService();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const usage = await mediaService.findUsage(id);
    return NextResponse.json({ success: true, data: usage });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to find usage" },
      { status: 500 },
    );
  }
}
