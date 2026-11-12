import postgres from "postgres";

type Sql = postgres.Sql<{}>;

export interface ActivityRow {
  id: string;
  leadId: string;
  activityType: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
}

export class ActivityRepository {
  constructor(private sql: Sql) {}

  async log(
    leadId: string,
    activityType: string,
    description: string,
    createdBy?: string | null,
    metadata?: Record<string, unknown> | null
  ): Promise<ActivityRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<ActivityRow[]>(
      `INSERT INTO lead_activities (id, lead_id, activity_type, description, metadata, created_by) VALUES ($1::uuid, $2::uuid, $3, $4, $5::jsonb, $6::uuid) RETURNING *`,
      [id, leadId, activityType, description, metadata ? JSON.stringify(metadata) : null, createdBy ?? null]
    );
    return rows[0]!;
  }

  async getByLeadId(leadId: string): Promise<ActivityRow[]> {
    return this.sql.unsafe<ActivityRow[]>(
      "SELECT * FROM lead_activities WHERE lead_id = $1::uuid ORDER BY created_at ASC",
      [leadId]
    );
  }

  async getRecentByLeadId(leadId: string, limit = 50): Promise<ActivityRow[]> {
    return this.sql.unsafe<ActivityRow[]>(
      "SELECT * FROM lead_activities WHERE lead_id = $1::uuid ORDER BY created_at DESC LIMIT $2",
      [leadId, limit]
    );
  }
}
