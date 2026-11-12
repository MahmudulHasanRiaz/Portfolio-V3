import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const rows = await sql.unsafe(
        "SELECT * FROM project_activity_logs WHERE project_id = $1::uuid ORDER BY created_at DESC LIMIT 50",
        [projectId]
      );
      // The detail page reads camelCase fields (projectId, createdAt).
      return NextResponse.json({
        activities: (rows as Record<string, unknown>[]).map((r) => ({
          id: r.id,
          projectId: r.project_id,
          actorId: r.actor_id,
          action: r.action,
          metadata: r.metadata,
          createdAt: r.created_at,
        })),
      });
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
