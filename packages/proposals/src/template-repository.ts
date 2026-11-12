import postgres from "postgres";
import type { ProposalTemplateFilters, ProposalTemplateRow, ProposalTemplateListResponse } from "./types";

type Sql = postgres.Sql<{}>;

// Aliased columns: unaliased star selects return snake_case keys, while
// consumers expect camelCase (projectCategoryId/clientType/isActive).
const TEMPLATE_COLUMNS = 'id, name, project_category_id AS "projectCategoryId", client_type AS "clientType", type, content, variables, is_active AS "isActive", created_by AS "createdBy", created_at AS "createdAt"';

export class ProposalTemplateRepository {
  constructor(private sql: Sql) {}

  async list(filters: ProposalTemplateFilters = {}): Promise<ProposalTemplateListResponse> {
    const { type, clientType, isActive, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (type) {
      conditions.push(`type = $${params.length + 1}`);
      params.push(type);
    }
    if (clientType) {
      conditions.push(`client_type = $${params.length + 1}`);
      params.push(clientType);
    }
    if (isActive !== undefined) {
      conditions.push(`is_active = $${params.length + 1}`);
      params.push(isActive as any);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM proposal_templates ${where}`,
      params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<ProposalTemplateRow[]>(
      `SELECT ${TEMPLATE_COLUMNS} FROM proposal_templates ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { templates: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<ProposalTemplateRow | null> {
    const rows = await this.sql.unsafe<ProposalTemplateRow[]>(
      `SELECT ${TEMPLATE_COLUMNS} FROM proposal_templates WHERE id = $1::uuid`,
      [id]
    );
    return rows[0] ?? null;
  }

  async create(data: Record<string, unknown>): Promise<ProposalTemplateRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const now = new Date().toISOString();
    const cols: string[] = ["id", "created_at"];
    const vals: postgres.ParameterOrJSON<never>[] = [id, now];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      cols.push(dbCol);
      vals.push(value as any);
    }

    const ph = cols.map((_, i) => `$${i + 1}`);
    const rows = await this.sql.unsafe<ProposalTemplateRow[]>(
      `INSERT INTO proposal_templates (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING ${TEMPLATE_COLUMNS}`,
      vals
    );
    return rows[0]!;
  }

  async update(id: string, data: Record<string, unknown>): Promise<ProposalTemplateRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      sets.push(`${dbCol} = $${vals.length + 1}`);
      vals.push(value as any);
    }

    if (sets.length === 0) return this.getById(id);
    vals.push(id);

    const rows = await this.sql.unsafe<ProposalTemplateRow[]>(
      `UPDATE proposal_templates SET ${sets.join(", ")} WHERE id = $${vals.length}::uuid RETURNING ${TEMPLATE_COLUMNS}`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM proposal_templates WHERE id = $1::uuid RETURNING id",
      [id]
    );
    return result.length > 0;
  }
}
