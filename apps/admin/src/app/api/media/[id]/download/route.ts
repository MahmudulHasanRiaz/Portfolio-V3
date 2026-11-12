import { NextResponse, NextRequest } from "next/server";
import { MediaService, NotFoundError, MediaError } from "@repo/media";
import { auth, authorizeByEmail } from "@repo/auth/server";

const mediaService = new MediaService();

/** ASCII-safe fallback filename for the Content-Disposition header. */
function safeFilename(name: string): string {
  const base = name
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "file";
}

/**
 * GET /api/media/[id]/download — stream a media file back as an attachment.
 *
 * Same-origin proxy: the files server (files.riaz.com.bd) sends no
 * Access-Control-Allow-Origin header, so a browser fetch() of the public
 * URL from the admin origin is CORS-blocked and the Media Library Download
 * button fell back to window.open() — which just opened the file in a new
 * tab instead of downloading it. Fetching server-side has no CORS issue,
 * and streaming it back with Content-Disposition: attachment makes the
 * browser download the file.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Session from the Better Auth cookie (same pattern as /api/media/upload).
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await authorizeByEmail(session.user.email, "media_manager", "admin", "super_admin");

    const { id } = await params;
    const asset = await mediaService.getById(id);
    if (!asset?.url) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const upstream = await fetch(asset.url);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Failed to fetch file from storage" },
        { status: 502 },
      );
    }

    const filename = asset.originalName || asset.filename || "file";
    const contentType =
      asset.type || upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${safeFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    if (contentLength) headers.set("Content-Length", contentLength);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof MediaError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 },
    );
  }
}
