import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createCrmRepositories } from "@repo/crm";
import { dispatchTrigger } from "@repo/workflows";

const dbUrl = process.env.DATABASE_URL!;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { status: newStatus } = await request.json();

    if (!newStatus) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    // Reject values outside the lead_status enum with a 400 instead of
    // letting the enum cast surface a 500.
    const validStatuses = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost", "archived"];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: `Invalid status: ${newStatus}` }, { status: 400 });
    }

    const { leads, activities } = createCrmRepositories(dbUrl);
    const lead = await leads.changeStatus(id, newStatus);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    await activities.log(id, "status_changed", `Status changed to ${newStatus}`, session.user.id, { newStatus });
    await dispatchTrigger(dbUrl, "lead_status_changed", id, { lead, newStatus, triggeredBy: session.user.id });
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to change lead status" },
      { status: 500 },
    );
  }
}
