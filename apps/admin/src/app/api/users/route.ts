import { auth } from "@repo/auth/server";
import { NextRequest, NextResponse } from "next/server";

const dbUrl = process.env.DATABASE_URL!;

/**
 * GET /api/users — assignable dashboard users for the CRM Assign control.
 * Reads the internal `users` table (uuid PKs), NOT `ba_user`: lead
 * assignment stores `assigned_user_id` as uuid, and Better Auth ids are
 * opaque text, so listing `ba_user` ids would make every assign fail
 * the `::uuid` cast in the assign route. Only active users are listed.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { default: postgres } = await import("postgres");
    const sql = postgres(dbUrl, { max: 1 });

    try {
      const rows = await sql.unsafe(
        "SELECT id, name, email FROM users WHERE is_active IS DISTINCT FROM false ORDER BY name ASC NULLS LAST, email ASC"
      );
      return NextResponse.json(
        (rows as Record<string, unknown>[]).map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
        }))
      );
    } finally {
      await sql.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 },
    );
  }
}
