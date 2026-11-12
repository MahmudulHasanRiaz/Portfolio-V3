import postgres from "postgres";
import type { InvoiceRow, InvoiceFilters, InvoiceListResponse } from "./types";

type Sql = postgres.Sql<{}>;

export class InvoiceRepository {
  constructor(private sql: Sql) {}

  async listByClient(clientId: string, filters: InvoiceFilters = {}): Promise<InvoiceListResponse> {
    const { status, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = ["i.client_id = $1::uuid"];
    const params: postgres.ParameterOrJSON<never>[] = [clientId];

    if (status) {
      conditions.push(`i.status = $${params.length + 1}`);
      params.push(status);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM finance_invoices i ${where}`,
      params
    );
    const total = Number(countResult[0]?.total ?? 0);

    const rows = await this.sql.unsafe<InvoiceRow[]>(
      `SELECT i.* FROM finance_invoices i ${where} ORDER BY i.issued_date DESC NULLS LAST, i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    return { invoices: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<InvoiceRow | null> {
    const rows = await this.sql.unsafe<InvoiceRow[]>(
      "SELECT * FROM finance_invoices WHERE id = $1::uuid",
      [id]
    );
    return rows[0] ?? null;
  }

  async listByProject(projectId: string): Promise<InvoiceRow[]> {
    return this.sql.unsafe<InvoiceRow[]>(
      "SELECT * FROM finance_invoices WHERE source_id = $1::uuid AND source_type = 'freelance_project' ORDER BY issued_date DESC NULLS LAST",
      [projectId]
    );
  }

  async getOutstandingCount(clientId: string): Promise<number> {
    const rows = await this.sql.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int as count FROM finance_invoices WHERE client_id = $1::uuid AND status IN ('draft', 'sent')",
      [clientId]
    );
    return Number(rows[0]?.count ?? 0);
  }
}
