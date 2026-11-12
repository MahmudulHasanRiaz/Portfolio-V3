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
    const { timeline } = createEntrepreneurRepositories();
    const events = await timeline.getByVentureId(id);
    return NextResponse.json(toCamel(events));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch timeline events" },
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

    const { timeline } = createEntrepreneurRepositories();
    const event = await timeline.addEvent(id, {
      eventType: body.eventType,
      title: body.title,
      description: body.description,
      eventDate: body.eventDate,
      icon: body.icon,
      url: body.url,
    });
    return NextResponse.json(toCamel(event), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add timeline event" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await params;
    const { eventId } = await request.json();
    if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

    const { timeline } = createEntrepreneurRepositories();
    const deleted = await timeline.deleteEvent(eventId);
    if (!deleted) return NextResponse.json({ error: "Timeline event not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete timeline event" },
      { status: 500 },
    );
  }
}
