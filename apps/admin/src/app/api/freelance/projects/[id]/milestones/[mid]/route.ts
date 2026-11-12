import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { logProjectActivity } from "@/lib/project-activity";

const dbUrl = process.env.DATABASE_URL!;

const MILESTONE_STATUSES = new Set(["pending", "in_progress", "completed", "approved"]);

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; mid: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, mid } = await params;
    const body = await request.json();

    if (body.status !== undefined && body.status !== null && body.status !== "" && !MILESTONE_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid milestone status" }, { status: 400 });
    }

    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const sets: string[] = [];
      const vals: any[] = [];

      for (const [key, value] of Object.entries(body)) {
        if (value === undefined) continue;
        const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        if (dbCol === "id" || dbCol === "project_id" || dbCol === "created_at") continue;
        sets.push(`${dbCol} = $${vals.length + 1}`);
        vals.push(value === "" ? null : value);
      }

      if (sets.length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });

      vals.push(mid);
      vals.push(projectId);
      const rows = await sql.unsafe(
        `UPDATE project_milestones SET ${sets.join(", ")} WHERE id = $${vals.length - 1}::uuid AND project_id = $${vals.length}::uuid RETURNING *`,
        vals
      );

      if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await logProjectActivity(sql, {
        projectId,
        actorId: session.user.id,
        action: "milestone_updated",
        metadata: { milestoneId: mid, fields: Object.keys(body) },
      });

      return NextResponse.json(rows[0]);
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update milestone" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; mid: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, mid } = await params;
    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const deleted = await sql.unsafe(
        "DELETE FROM project_milestones WHERE id = $1::uuid AND project_id = $2::uuid RETURNING id",
        [mid, projectId],
      );
      if (!deleted[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await logProjectActivity(sql, {
        projectId,
        actorId: session.user.id,
        action: "milestone_deleted",
        metadata: { milestoneId: mid },
      });

      return NextResponse.json({ success: true });
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete milestone" }, { status: 500 });
  }
}
