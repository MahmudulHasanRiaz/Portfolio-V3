import type postgres from "postgres";

/**
 * Best-effort activity log for freelance projects. Logging must never break
 * the main operation, so every failure is swallowed here.
 */
export async function logProjectActivity(
  sql: postgres.Sql,
  input: {
    projectId: string;
    actorId?: string | null;
    action: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { randomUUID } = await import("node:crypto");
    await sql.unsafe(
      "INSERT INTO project_activity_logs (id, project_id, actor_id, action, metadata) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::jsonb)",
      [
        randomUUID(),
        input.projectId,
        input.actorId ?? null,
        input.action,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  } catch {
    // Activity logging is informational only.
  }
}
