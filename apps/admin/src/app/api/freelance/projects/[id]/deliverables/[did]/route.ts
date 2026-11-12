import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { logProjectActivity } from "@/lib/project-activity";

const dbUrl = process.env.DATABASE_URL!;

const DELIVERABLE_STATUSES = new Set(["pending", "submitted", "approved", "revision_requested"]);

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; did: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, did } = await params;
    const body = await request.json();

    if (body.status !== undefined && body.status !== null && body.status !== "" && !DELIVERABLE_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid deliverable status" }, { status: 400 });
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

      vals.push(did);
      vals.push(projectId);
      const rows = await sql.unsafe(
        `UPDATE project_deliverables SET ${sets.join(", ")} WHERE id = $${vals.length - 1}::uuid AND project_id = $${vals.length}::uuid RETURNING *`,
        vals
      );

      if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await logProjectActivity(sql, {
        projectId,
        actorId: session.user.id,
        action: "deliverable_updated",
        metadata: { deliverableId: did, fields: Object.keys(body) },
      });

      return NextResponse.json(rows[0]);
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update deliverable" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; did: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, did } = await params;
    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const deleted = await sql.unsafe(
        "DELETE FROM project_deliverables WHERE id = $1::uuid AND project_id = $2::uuid RETURNING id",
        [did, projectId],
      );
      if (!deleted[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await logProjectActivity(sql, {
        projectId,
        actorId: session.user.id,
        action: "deliverable_deleted",
        metadata: { deliverableId: did },
      });

      return NextResponse.json({ success: true });
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete deliverable" }, { status: 500 });
  }
}
