import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createCrmRepositories } from "@repo/crm";
import { dispatchTrigger } from "@repo/workflows";

const dbUrl = process.env.DATABASE_URL!;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const assignedTo = searchParams.get("assignedTo");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const { leads } = createCrmRepositories(dbUrl);
    const result = await leads.list({
      status: status ?? undefined,
      source: source ?? undefined,
      assignedTo: assignedTo ?? undefined,
      search: search ?? undefined,
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
      page,
      pageSize,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leads" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { visitorId, ...leadData } = body;

    // No fullName requirement here on purpose: the column is nullable and
    // the UI renders nameless leads as "Unnamed" — abandoned captures are
    // often email-only, and the Recovery flow creates leads from them.
    // The manual-entry dialog still requires a name client-side.

    const { leads, activities } = createCrmRepositories(dbUrl);
    const lead = await leads.create({ ...leadData, createdBy: session.user.id });
    await activities.log(lead.id, "lead_created", "Lead created via form/manual entry", session.user.id, { source: leadData.leadSource });
    await dispatchTrigger(dbUrl, "lead_created", lead.id, { ...lead, triggeredBy: session.user.id });

    if (visitorId) {
      try {
        const { LeadAttributionService } = await import("@repo/analytics");
        const attribution = new LeadAttributionService();
        await attribution.linkPageViewsToLead(visitorId, lead.id);
      } catch (err) {
        console.error("[Leads API] Failed to link attribution:", err);
      }
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create lead" },
      { status: 500 },
    );
  }
}
