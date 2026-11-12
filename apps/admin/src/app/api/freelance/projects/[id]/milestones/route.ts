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
        "SELECT * FROM project_milestones WHERE project_id = $1::uuid ORDER BY sort_order ASC NULLS LAST, created_at ASC",
        [projectId]
      );
      // The detail page reads camelCase fields (dueDate, sortOrder).
      return NextResponse.json(
        (rows as Record<string, unknown>[]).map((r) => ({
          id: r.id,
          projectId: r.project_id,
          title: r.title,
          description: r.description,
          dueDate: r.due_date,
          status: r.status,
          sortOrder: r.sort_order,
          createdAt: r.created_at,
        })),
      );
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch milestones" },
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
      return NextResponse.json({ error: "Milestone title is required" }, { status: 400 });
    }

    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const { randomUUID } = await import("node:crypto");
      const id = randomUUID();
      const now = new Date().toISOString();

      await sql.unsafe(
        "INSERT INTO project_milestones (id, project_id, title, description, due_date, status, sort_order, created_at) VALUES ($1::uuid, $2::uuid, $3, $4, $5, 'pending', $6, $7)",
        [id, projectId, body.title, body.description || null, body.dueDate || null, body.sortOrder || 0, now]
      );

      const rows = await sql.unsafe("SELECT * FROM project_milestones WHERE id = $1::uuid", [id]);

      await logProjectActivity(sql, {
        projectId,
        actorId: session.user.id,
        action: "milestone_created",
        metadata: { milestoneId: id, title: body.title },
      });

      return NextResponse.json(rows[0], { status: 201 });
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create milestone" },
      { status: 500 }
    );
  }
}
