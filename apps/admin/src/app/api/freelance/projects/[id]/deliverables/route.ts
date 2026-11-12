import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { logProjectActivity } from "@/lib/project-activity";

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
        "SELECT * FROM project_deliverables WHERE project_id = $1::uuid ORDER BY created_at DESC NULLS LAST",
        [projectId]
      );
      // The detail page reads camelCase fields (milestoneId, fileUrl, submittedAt).
      return NextResponse.json({
        deliverables: (rows as Record<string, unknown>[]).map((r) => ({
          id: r.id,
          projectId: r.project_id,
          milestoneId: r.milestone_id,
          title: r.title,
          fileUrl: r.file_url,
          notes: r.notes,
          status: r.status,
          clientFeedback: r.client_feedback,
          submittedAt: r.submitted_at,
          approvedAt: r.approved_at,
        })),
      });
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch deliverables" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const body = await request.json();

    if (typeof body.title !== "string" || body.title.trim() === "") {
      return NextResponse.json({ error: "Deliverable title is required" }, { status: 400 });
    }

    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const { randomUUID } = await import("node:crypto");
      const id = randomUUID();

      await sql.unsafe(
        "INSERT INTO project_deliverables (id, project_id, milestone_id, title, file_url, notes, status) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, 'pending')",
        [
          id,
          projectId,
          body.milestoneId ? body.milestoneId : null,
          body.title,
          typeof body.fileUrl === "string" && body.fileUrl.trim() !== "" ? body.fileUrl.trim() : null,
          typeof body.notes === "string" && body.notes.trim() !== "" ? body.notes.trim() : null,
        ]
      );

      const rows = await sql.unsafe("SELECT * FROM project_deliverables WHERE id = $1::uuid", [id]);

      await logProjectActivity(sql, {
        projectId,
        actorId: session.user.id,
        action: "deliverable_created",
        metadata: { deliverableId: id, title: body.title },
      });

      return NextResponse.json(rows[0], { status: 201 });
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create deliverable" },
      { status: 500 }
    );
  }
}
