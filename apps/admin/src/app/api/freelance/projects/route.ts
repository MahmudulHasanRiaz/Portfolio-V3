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

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const parsedPage = parseInt(searchParams.get("page") ?? "1", 10);
    const parsedPageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const pageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0 && parsedPageSize <= 100 ? parsedPageSize : 20;

    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const conditions: string[] = [];
      const params: any[] = [];

      if (search) {
        conditions.push(`(title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`);
        params.push(`%${search}%`);
      }
      if (status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(status);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const offset = (page - 1) * pageSize;

      const countResult = await sql.unsafe<{ total: number }[]>(
        `SELECT COUNT(*)::int as total FROM projects_freelance ${where}`,
        params.length > 0 ? params : undefined
      );
      const total = Number(countResult[0]?.total ?? 0);

      const rows = await sql.unsafe(
        `SELECT * FROM projects_freelance ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
      );

      return NextResponse.json({
        projects: (rows as Record<string, unknown>[]).map((r) => ({
          id: r.id, title: r.title, clientId: r.client_id, status: r.status,
          totalAgreedAmount: r.total_agreed_amount, currency: r.currency,
          portalAccessEnabled: r.portal_access_enabled, createdAt: r.created_at,
        })),
        total, page, pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    // Title is required; blank dates/amounts arrive as "" from the form and
    // must not reach date/numeric columns (Postgres rejects "" with a 500).
    // Skipped keys fall back to the column default / NULL.
    if (typeof body.title !== "string" || body.title.trim() === "") {
      return NextResponse.json({ error: "Project title is required" }, { status: 400 });
    }
    if (body.status !== undefined && body.status !== null && body.status !== "" && !PROJECT_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const { randomUUID } = await import("node:crypto");
      const id = randomUUID();
      const now = new Date().toISOString();

      const cols: string[] = ["id", "created_by", "created_at", "updated_at"];
      const vals: any[] = [id, session.user.id, now, now];

      for (const [key, value] of Object.entries(body)) {
        if (value === undefined || value === null || value === "") continue;
        if (key === "id" || key === "createdAt" || key === "updatedAt" || key === "createdBy") continue;
        const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        cols.push(dbCol);
        vals.push(value);
      }

      const ph = cols.map((_, i) => `$${i + 1}`);
      const rows = await sql.unsafe(
        `INSERT INTO projects_freelance (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING *`,
        vals
      );

      await logProjectActivity(sql, {
        projectId: id,
        actorId: session.user.id,
        action: "project_created",
        metadata: { title: body.title },
      });

      return NextResponse.json(rows[0], { status: 201 });
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create project" },
      { status: 500 }
    );
  }
}
