import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { createWorkflowService, getRegisteredActions } from "@repo/workflows";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { triggerType, entityId, payload } = body as {
      triggerType?: string;
      entityId?: string;
      payload?: Record<string, unknown>;
    };

    if (!triggerType) {
      return NextResponse.json({ error: "triggerType is required" }, { status: 400 });
    }

    const { triggerRegistry } = createWorkflowService(dbUrl);
    const result = await triggerRegistry.dispatch({
      triggerType,
      entityId: entityId || undefined,
      payload: payload || {},
    });

    return NextResponse.json({
      ...result,
      availableTriggers: [
        "lead_created",
        "lead_status_changed",
        "form_submitted",
        "content_published",
        "venture_published",
        "release_published",
        "proposal_accepted",
        "invoice_paid",
        "payment_received",
        "portal_message_received",
      ],
      availableActions: getRegisteredActions(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trigger test failed" },
      { status: 500 },
    );
  }
}
