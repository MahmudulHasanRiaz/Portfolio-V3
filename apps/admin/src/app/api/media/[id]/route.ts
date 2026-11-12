import { NextResponse } from "next/server";
import { MediaService, NotFoundError, MediaError } from "@repo/media";

const mediaService = new MediaService();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const asset = await mediaService.getById(id);
    return NextResponse.json({ success: true, data: asset });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch media" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    await mediaService.updateMetadata(id, {
      altText: body.altText,
      folderId: body.folderId,
      originalName: body.originalName,
      // `filename` is accepted as a display-name alias; the stored R2 key
      // never changes (content rows reference the public URL).
      filename: body.filename,
      slug: body.slug,
    });

    const updated = await mediaService.getById(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof MediaError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update media" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await mediaService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete media" },
      { status: 500 },
    );
  }
}
