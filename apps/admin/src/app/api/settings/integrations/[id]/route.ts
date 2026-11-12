// Website Integrations — admin API (single integration).
// PATCH /api/settings/integrations/[id] — rename / enable / disable.
// DELETE /api/settings/integrations/[id] — revoke (deletes the row).
// Neither response ever contains a token — only the list item.
import { NextResponse, type NextRequest } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@repo/auth/server";
import {
  deleteIntegration,
  requireIntegrationAdmin,
  updateIntegration,
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

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireIntegrationAdmin(request);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const patch: { name?: string; isActive?: boolean } = {};
    if (body?.name !== undefined) {
      if (typeof body.name !== "string") {
        return NextResponse.json(
          { error: "name must be a string" },
          { status: 400 },
        );
      }
      const name = body.name.trim();
      if (name === "" || name.length > 255) {
        return NextResponse.json(
          { error: "name must be a non-empty string of at most 255 characters" },
          { status: 400 },
        );
      }
      patch.name = name;
    }
    if (body?.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { error: "isActive must be a boolean" },
          { status: 400 },
        );
      }
      patch.isActive = body.isActive;
    }
    const integration = await updateIntegration(id, patch);
    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ integration });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await requireIntegrationAdmin(request);
    const { id } = await params;
    const deleted = await deleteIntegration(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
