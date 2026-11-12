import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createEntrepreneurRepositories } from "@repo/entrepreneur";
import { toCamel } from "@/lib/to-camel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const { ventures } = createEntrepreneurRepositories();
    const result = await ventures.getMediaMentions(id, { page, pageSize });
    return NextResponse.json(toCamel(result));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch media coverage" },
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
    if (!body.title?.trim() && !body.sourceName?.trim()) {
      return NextResponse.json({ error: "Title or source name is required" }, { status: 400 });
    }

    const { ventures } = createEntrepreneurRepositories();
    const mention = await ventures.createMediaMention(id, {
      title: body.title,
      slug: body.slug,
      sourceName: body.sourceName,
      sourceUrl: body.sourceUrl,
      publishedDate: body.publishedDate,
      summary: body.summary,
      isFeatured: body.isFeatured,
      status: body.status,
    });
    return NextResponse.json(toCamel(mention), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add media coverage" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await params;
    const body = await request.json();
    const mentionId = body.mentionId ?? body.id;
    if (!mentionId) return NextResponse.json({ error: "mentionId required" }, { status: 400 });

    const { ventures } = createEntrepreneurRepositories();
    const mention = await ventures.updateMediaMention(mentionId, {
      title: body.title,
      slug: body.slug,
      sourceName: body.sourceName,
      sourceUrl: body.sourceUrl,
      publishedDate: body.publishedDate,
      summary: body.summary,
      isFeatured: body.isFeatured,
      status: body.status,
    });
    if (!mention) return NextResponse.json({ error: "Media mention not found" }, { status: 404 });
    return NextResponse.json(toCamel(mention));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update media coverage" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await params;
    const body = await request.json().catch(() => ({}));
    const mentionId =
      body.mentionId ?? body.id ?? new URL(request.url).searchParams.get("mentionId");
    if (!mentionId) return NextResponse.json({ error: "mentionId required" }, { status: 400 });

    const { ventures } = createEntrepreneurRepositories();
    const deleted = await ventures.deleteMediaMention(mentionId);
    if (!deleted) return NextResponse.json({ error: "Media mention not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete media coverage" },
      { status: 500 },
    );
  }
}
