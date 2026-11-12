import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createCrmRepositories } from "@repo/crm";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { leads, activities, notes } = createCrmRepositories(dbUrl);
    const lead = await leads.getById(id);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const [activityList, noteList] = await Promise.all([
      activities.getRecentByLeadId(id),
      notes.getByLeadId(id),
    ]);
    return NextResponse.json({ ...lead, activities: activityList, notes: noteList });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch lead" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const { leads, activities } = createCrmRepositories(dbUrl);
    const lead = await leads.update(id, body);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    await activities.log(id, "lead_updated", "Lead information updated", session.user.id, { updatedFields: Object.keys(body) });
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update lead" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { leads } = createCrmRepositories(dbUrl);
    const deleted = await leads.delete(id);
    if (!deleted) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete lead" },
      { status: 500 },
    );
  }
}
