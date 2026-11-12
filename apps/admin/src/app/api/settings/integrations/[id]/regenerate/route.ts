// Website Integrations — admin API (token regeneration).
// POST /api/settings/integrations/[id]/regenerate — issue a new token for
// the integration (the old token stops working immediately). The new full
// token is returned exactly once here and never again.
import { NextResponse, type NextRequest } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@repo/auth/server";
import {
  regenerateIntegrationToken,
  requireIntegrationAdmin,
} from "@/lib/website-integrations";

function handleError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Request failed" },
    { status: 500 },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireIntegrationAdmin(request);
    const { id } = await params;
    const result = await regenerateIntegrationToken(id);
    if (!result) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
