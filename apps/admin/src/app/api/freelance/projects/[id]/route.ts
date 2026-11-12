import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { logProjectActivity } from "@/lib/project-activity";

const dbUrl = process.env.DATABASE_URL!;

const PROJECT_STATUSES = new Set([
  "draft",
  "in_progress",
  "under_review",
  "revision_requested",
  "completed",
  "archived",
]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const rows = await sql.unsafe("SELECT * FROM projects_freelance WHERE id = $1::uuid", [id]);
      if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const r = rows[0] as Record<string, unknown>;
      return NextResponse.json({
        id: r.id, title: r.title, clientId: r.client_id, status: r.status,
        description: r.description, scopeNotes: r.scope_notes,
        startDate: r.start_date, expectedEndDate: r.expected_end_date, actualEndDate: r.actual_end_date,
        totalAgreedAmount: r.total_agreed_amount, currency: r.currency,
        isPaidProject: r.is_paid_project, portalAccessEnabled: r.portal_access_enabled,
        portalToken: r.portal_token, createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
      });
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (body.status !== undefined && body.status !== null && body.status !== "" && !PROJECT_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (body.title !== undefined && (typeof body.title !== "string" || body.title.trim() === "")) {
      return NextResponse.json({ error: "Project title cannot be empty" }, { status: 400 });
    }

    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const sets: string[] = [];
      const vals: any[] = [];

      for (const [key, value] of Object.entries(body)) {
        if (value === undefined || key === "id" || key === "createdAt" || key === "createdBy") continue;
        const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        sets.push(`${dbCol} = $${vals.length + 1}`);
        // A blank form field clears the value ("" is invalid for
        // date/numeric columns and meaningless for text ones).
        vals.push(value === "" ? null : value);
      }

      if (sets.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

      sets.push("updated_at = NOW()");
      vals.push(id);

      const rows = await sql.unsafe(
        `UPDATE projects_freelance SET ${sets.join(", ")} WHERE id = $${vals.length}::uuid RETURNING *`,
        vals
      );

      if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await logProjectActivity(sql, {
        projectId: id,
        actorId: session.user.id,
        action: typeof body.status === "string" && body.status !== "" ? "status_changed" : "project_updated",
        metadata:
          typeof body.status === "string" && body.status !== ""
            ? { status: body.status }
            : { fields: Object.keys(body) },
      });

      return NextResponse.json(rows[0]);
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const existing = await sql.unsafe("SELECT id FROM projects_freelance WHERE id = $1::uuid", [id]);
      if (!existing[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await logProjectActivity(sql, {
        projectId: id,
        actorId: session.user.id,
        action: "project_deleted",
        metadata: {},
      });

      // No FK cascade exists on milestones/deliverables/activity logs, so
      // remove them explicitly — otherwise deleting a project orphans rows.
      await sql.unsafe("DELETE FROM project_deliverables WHERE project_id = $1::uuid", [id]);
      await sql.unsafe("DELETE FROM project_milestones WHERE project_id = $1::uuid", [id]);
      await sql.unsafe("DELETE FROM project_activity_logs WHERE project_id = $1::uuid", [id]);

      const result = await sql.unsafe("DELETE FROM projects_freelance WHERE id = $1::uuid RETURNING id", [id]);
      if (!result[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true });
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete project" },
      { status: 500 }
    );
  }
}
