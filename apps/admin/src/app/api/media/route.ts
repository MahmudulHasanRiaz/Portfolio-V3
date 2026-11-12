import { NextResponse } from "next/server";
import { MediaService } from "@repo/media";

const mediaService = new MediaService();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());

    const result = await mediaService.list({
      query: searchParams.query,
      folderId: searchParams.folderId,
      type: searchParams.type,
      uploadedBy: searchParams.uploadedBy,
      sortBy: searchParams.sortBy,
      sortDir: (searchParams.sortDir as "asc" | "desc") || "desc",
      page: searchParams.page ? parseInt(searchParams.page) : 1,
      pageSize: searchParams.pageSize ? parseInt(searchParams.pageSize) : 50,
      includeDeleted: searchParams.includeDeleted === "true",
      attached:
        searchParams.attached === "true"
          ? true
          : searchParams.attached === "false"
            ? false
            : undefined,
      includeUsage: searchParams.includeUsage === "true",
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch media" },
      { status: 500 },
    );
  }
}
