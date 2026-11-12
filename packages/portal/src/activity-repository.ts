import postgres from "postgres";
import type { ActivityLogRow, ActivityListResponse } from "./types";

type Sql = postgres.Sql<{}>;

export class ActivityRepository {
  constructor(private sql: Sql) {}

  async listByProject(projectId: string, page = 1, pageSize = 50): Promise<ActivityListResponse> {
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      "SELECT COUNT(*)::int as total FROM project_activity_logs WHERE project_id = $1::uuid",
      [projectId]
    );
    const total = Number(countResult[0]?.total ?? 0);

    const rows = await this.sql.unsafe<ActivityLogRow[]>(
      "SELECT * FROM project_activity_logs WHERE project_id = $1::uuid ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [projectId, pageSize, offset]
    );

    return { activities: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async log(projectId: string, actorId: string | null, action: string, metadata: Record<string, unknown> | null = null): Promise<void> {
    await this.sql.unsafe(
      "INSERT INTO project_activity_logs (project_id, actor_id, action, metadata) VALUES ($1::uuid, $2, $3, $4)",
      [projectId, actorId, action, metadata ? JSON.stringify(metadata) : null]
    );
  }
}
