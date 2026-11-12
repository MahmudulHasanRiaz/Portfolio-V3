import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { SlugRedirectsRepository } from "@repo/database/repository/seo";

const repo = new SlugRedirectsRepository();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.role || !["admin", "editor", "marketer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = await repo.update(id, body);

    if (!result) {
      return NextResponse.json({ error: "Redirect not found." }, { status: 404 });
    }

    return NextResponse.json({ redirect: result });
  } catch (error) {
    console.error("[Redirects API] Error:", error);
    return NextResponse.json({ error: "Failed to update redirect." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.role || !["admin", "editor", "marketer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await repo.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Redirect not found." }, { status: 404 });
    }

    await repo.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Redirects API] Error:", error);
    return NextResponse.json({ error: "Failed to delete redirect." }, { status: 500 });
  }
}
