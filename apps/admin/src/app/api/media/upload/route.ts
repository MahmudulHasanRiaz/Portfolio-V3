import { NextResponse, NextRequest } from "next/server";
import { MediaService, ValidationError, StorageError, MediaError } from "@repo/media";
import { auth, authorizeByEmail } from "@repo/auth/server";

const mediaService = new MediaService();

export async function POST(request: NextRequest) {
  try {
    // Session from the Better Auth cookie (the dashboard middleware
    // already requires it for /api/*). The old `x-user-email` header
    // was never sent by the browser, so every upload 401'd even for
    // a valid admin session — the Favicon (and Hero portrait) upload
    // could never succeed.
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await authorizeByEmail(session.user.email, "media_manager", "admin", "super_admin");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = (formData.get("folder") as string) || undefined;
    const folderId = (formData.get("folderId") as string) || undefined;
    const altText = (formData.get("altText") as string) || undefined;

    const result = await mediaService.upload(buffer, file.name, file.type, user.id, {
      folder,
      folderId,
      altText,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof MediaError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
