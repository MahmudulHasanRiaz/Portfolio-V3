import postgres from "postgres";
import type { FreelanceProjectRow, ProjectFilters, ProjectListResponse } from "./types";

type Sql = postgres.Sql<{}>;

// Aliased columns: raw SELECT * returns snake_case, consumers read camelCase
// (project.clientId was undefined, so the portal APIs reported "No client").
const PROJECT_COLUMNS = 'id, title, client_id AS "clientId", category_id AS "categoryId", status, description, scope_notes AS "scopeNotes", start_date AS "startDate", expected_end_date AS "expectedEndDate", actual_end_date AS "actualEndDate", total_agreed_amount AS "totalAgreedAmount", currency, is_paid_project AS "isPaidProject", tags, portal_access_enabled AS "portalAccessEnabled", portal_token AS "portalToken", created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"';
const PROJECT_COLUMNS_P = 'p.id, p.title, p.client_id AS "clientId", p.category_id AS "categoryId", p.status, p.description, p.scope_notes AS "scopeNotes", p.start_date AS "startDate", p.expected_end_date AS "expectedEndDate", p.actual_end_date AS "actualEndDate", p.total_agreed_amount AS "totalAgreedAmount", p.currency, p.is_paid_project AS "isPaidProject", p.tags, p.portal_access_enabled AS "portalAccessEnabled", p.portal_token AS "portalToken", p.created_by AS "createdBy", p.created_at AS "createdAt", p.updated_at AS "updatedAt"';

export class ProjectRepository {
  constructor(private sql: Sql) {}

  async listByClient(clientId: string, filters: ProjectFilters = {}): Promise<ProjectListResponse> {
    const { status, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = ["p.client_id = $1::uuid", "p.portal_access_enabled = true"];
    const params: postgres.ParameterOrJSON<never>[] = [clientId];

    if (status) {
      conditions.push(`p.status = $${params.length + 1}`);
      params.push(status);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM projects_freelance p ${where}`,
      params
    );
    const total = Number(countResult[0]?.total ?? 0);

    const rows = await this.sql.unsafe<FreelanceProjectRow[]>(
      `SELECT ${PROJECT_COLUMNS_P} FROM projects_freelance p ${where} ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    return { projects: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<FreelanceProjectRow | null> {
    const rows = await this.sql.unsafe<FreelanceProjectRow[]>(
      `SELECT ${PROJECT_COLUMNS} FROM projects_freelance WHERE id = $1::uuid`,
      [id]
    );
    return rows[0] ?? null;
  }

  async getByIdAndClient(id: string, clientId: string): Promise<FreelanceProjectRow | null> {
    const rows = await this.sql.unsafe<FreelanceProjectRow[]>(
      `SELECT ${PROJECT_COLUMNS} FROM projects_freelance WHERE id = $1::uuid AND client_id = $2::uuid AND portal_access_enabled = true`,
      [id, clientId]
    );
    return rows[0] ?? null;
  }

  async getClientIdFromProject(projectId: string): Promise<string | null> {
    const rows = await this.sql.unsafe<{ client_id: string }[]>(
      "SELECT client_id FROM projects_freelance WHERE id = $1::uuid",
      [projectId]
    );
    return rows[0]?.client_id ?? null;
  }

  async getProjectsByClientWithStatus(clientId: string, status: string): Promise<number> {
    const rows = await this.sql.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int as count FROM projects_freelance WHERE client_id = $1::uuid AND status = $2 AND portal_access_enabled = true",
      [clientId, status]
    );
    return Number(rows[0]?.count ?? 0);
  }
}
