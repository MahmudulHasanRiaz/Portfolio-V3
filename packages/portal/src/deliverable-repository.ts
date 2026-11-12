import postgres from "postgres";
import type { DeliverableRow, DeliverableFilters, DeliverableListResponse } from "./types";

type Sql = postgres.Sql<{}>;

export class DeliverableRepository {
  constructor(private sql: Sql) {}

  async listByProject(projectId: string, filters: DeliverableFilters = {}): Promise<DeliverableListResponse> {
    const { status, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = ["d.project_id = $1::uuid"];
    const params: postgres.ParameterOrJSON<never>[] = [projectId];

    if (status) {
      conditions.push(`d.status = $${params.length + 1}`);
      params.push(status);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM project_deliverables d ${where}`,
      params
    );
    const total = Number(countResult[0]?.total ?? 0);

    const rows = await this.sql.unsafe<DeliverableRow[]>(
      `SELECT d.* FROM project_deliverables d ${where} ORDER BY d.created_at DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    return { deliverables: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async listByClient(clientId: string, filters: DeliverableFilters = {}): Promise<DeliverableListResponse> {
    const { status, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = ["p.client_id = $1::uuid", "p.portal_access_enabled = true"];
    const params: postgres.ParameterOrJSON<never>[] = [clientId];

    if (status) {
      conditions.push(`d.status = $${params.length + 1}`);
      params.push(status);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM project_deliverables d JOIN projects_freelance p ON p.id = d.project_id ${where}`,
      params
    );
    const total = Number(countResult[0]?.total ?? 0);

    const rows = await this.sql.unsafe<DeliverableRow[]>(
      `SELECT d.* FROM project_deliverables d JOIN projects_freelance p ON p.id = d.project_id ${where} ORDER BY d.created_at DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    return { deliverables: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<DeliverableRow | null> {
    const rows = await this.sql.unsafe<DeliverableRow[]>(
      "SELECT * FROM project_deliverables WHERE id = $1::uuid",
      [id]
    );
    return rows[0] ?? null;
  }

  async submitFeedback(id: string, feedback: string): Promise<DeliverableRow | null> {
    const rows = await this.sql.unsafe<DeliverableRow[]>(
      "UPDATE project_deliverables SET client_feedback = $1, status = 'revision_requested' WHERE id = $2::uuid RETURNING *",
      [feedback, id]
    );
    return rows[0] ?? null;
  }

  async getPendingCount(projectId: string): Promise<number> {
    const rows = await this.sql.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int as count FROM project_deliverables WHERE project_id = $1::uuid AND status = 'pending'",
      [projectId]
    );
    return Number(rows[0]?.count ?? 0);
  }
}
