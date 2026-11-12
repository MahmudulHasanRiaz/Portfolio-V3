import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { randomBytes } = await import("node:crypto");
    const newToken = randomBytes(32).toString("hex");

    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const sessions = await sql.unsafe("SELECT * FROM portal_sessions WHERE id = $1::uuid", [id]);
      if (!sessions[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const projectId = (sessions[0] as Record<string, unknown>).project_id as string;

      await sql.begin(async (tx) => {
        await tx.unsafe(
          "UPDATE portal_sessions SET portal_token = $1 WHERE id = $2::uuid",
          [newToken, id]
        );
        // Keep the denormalized copy on the freelance project in sync:
        // the portal login reads portal_sessions, but the project detail
        // shows projects_freelance.portal_token — after a regenerate the
        // two must agree, or the project page displays a stale token.
        await tx.unsafe(
          "UPDATE projects_freelance SET portal_token = $1, updated_at = NOW() WHERE id = $2::uuid",
          [newToken, projectId]
        );
      });
      return NextResponse.json({ success: true, portalToken: newToken });
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate token" },
      { status: 500 }
    );
  }
}
