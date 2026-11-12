import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createCrmRepositories } from "@repo/crm";

const dbUrl = process.env.DATABASE_URL!;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { assignedUserId } = await request.json();

    // assigned_user_id is a uuid column: reject non-uuid values with a 400
    // instead of letting the ::uuid cast surface a 500. (Better Auth ids
    // are opaque text, not uuids — assignees come from the `users` table
    // via GET /api/users.)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (assignedUserId !== null && assignedUserId !== undefined && !uuidPattern.test(String(assignedUserId))) {
      return NextResponse.json({ error: "assignedUserId must be a valid user id or null" }, { status: 400 });
    }

    const { leads, activities } = createCrmRepositories(dbUrl);
    const lead = await leads.assign(id, assignedUserId ?? null);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    await activities.log(id, "lead_assigned", assignedUserId ? `Assigned to user ${assignedUserId}` : "Unassigned", session.user.id, { assignedUserId });
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign lead" },
      { status: 500 },
    );
  }
}
