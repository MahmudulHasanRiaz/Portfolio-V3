import postgres from "postgres";
import type { MilestoneRow } from "./types";

type Sql = postgres.Sql<{}>;

export class MilestoneRepository {
  constructor(private sql: Sql) {}

  async listByProject(projectId: string): Promise<MilestoneRow[]> {
    return this.sql.unsafe<MilestoneRow[]>(
      "SELECT * FROM project_milestones WHERE project_id = $1::uuid ORDER BY sort_order ASC NULLS LAST, created_at ASC",
      [projectId]
    );
  }

  async getById(id: string): Promise<MilestoneRow | null> {
    const rows = await this.sql.unsafe<MilestoneRow[]>(
      "SELECT * FROM project_milestones WHERE id = $1::uuid",
      [id]
    );
    return rows[0] ?? null;
  }

  async getMilestoneCount(projectId: string): Promise<number> {
    const rows = await this.sql.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int as count FROM project_milestones WHERE project_id = $1::uuid",
      [projectId]
    );
    return Number(rows[0]?.count ?? 0);
  }
}
