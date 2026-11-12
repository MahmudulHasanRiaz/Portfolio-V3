import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const rows = await sql.unsafe(`
        SELECT ps.*, pf.title as project_title
        FROM portal_sessions ps
        LEFT JOIN projects_freelance pf ON pf.id = ps.project_id
        ORDER BY ps.created_at DESC
      `);

      return NextResponse.json(
        (rows as Record<string, unknown>[]).map((r) => ({
          id: r.id,
          projectId: r.project_id,
          portalToken: r.portal_token,
          clientEmail: r.client_email,
          lastAccessedAt: r.last_accessed_at,
          createdAt: r.created_at,
          projectTitle: r.project_title,
        }))
      );
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
