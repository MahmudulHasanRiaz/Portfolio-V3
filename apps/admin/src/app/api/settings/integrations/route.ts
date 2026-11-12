// Website Integrations — admin API.
// GET /api/settings/integrations — list all integrations (token prefix only).
// POST /api/settings/integrations — create one; the full token is returned
// exactly once here and never again.
import { NextResponse, type NextRequest } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@repo/auth/server";
import {
  createIntegration,
  listIntegrations,
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

/** Validate an integration name: non-empty string, max 255 chars. Returns
 * the trimmed name, or null when invalid. */
function validName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (name === "" || name.length > 255) return null;
  return name;
}

export async function GET(request: NextRequest) {
  try {
    await requireIntegrationAdmin(request);
    const integrations = await listIntegrations();
    return NextResponse.json({ integrations });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireIntegrationAdmin(request);
    const body = await request.json().catch(() => null);
    const name = validName(body?.name);
    if (!name) {
      return NextResponse.json(
        { error: "name must be a non-empty string of at most 255 characters" },
        { status: 400 },
      );
    }
    const { integration, token } = await createIntegration(name);
    return NextResponse.json({ integration, token }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
