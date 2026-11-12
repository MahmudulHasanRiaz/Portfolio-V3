import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";

const dbUrl = process.env.DATABASE_URL!;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const sessions = await sql.unsafe("SELECT * FROM portal_sessions WHERE id = $1::uuid", [id]);
      if (!sessions[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const projectId = (sessions[0] as Record<string, unknown>).project_id as string;

      await sql.begin(async (tx) => {
        await tx.unsafe("DELETE FROM portal_sessions WHERE id = $1::uuid", [id]);
        await tx.unsafe(
          "UPDATE projects_freelance SET portal_access_enabled = false, portal_token = NULL, updated_at = NOW() WHERE id = $1::uuid",
          [projectId]
        );
      });

      return NextResponse.json({ success: true });
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disable portal" },
      { status: 500 }
    );
  }
}
