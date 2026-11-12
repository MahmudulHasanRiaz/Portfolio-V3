import postgres from "postgres";

type Sql = postgres.Sql<{}>;

export interface AbandonedLeadRow {
  id: string;
  email: string | null;
  phone: string | null;
  sourcePage: string | null;
  metadata: Record<string, unknown> | null;
  capturedAt: string;
}

export class AbandonedRepository {
  constructor(private sql: Sql) {}

  async capture(data: { email?: string; phone?: string; sourcePage?: string; metadata?: Record<string, unknown> }): Promise<AbandonedLeadRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<AbandonedLeadRow[]>(
      "INSERT INTO abandoned_leads (id, email, phone, source_page, metadata) VALUES ($1::uuid, $2, $3, $4, $5::jsonb) RETURNING *",
      [id, data.email ?? null, data.phone ?? null, data.sourcePage ?? null, data.metadata ? JSON.stringify(data.metadata) : null]
    );
    return rows[0]!;
  }

  async list(): Promise<AbandonedLeadRow[]> {
    return this.sql.unsafe<AbandonedLeadRow[]>(
      "SELECT * FROM abandoned_leads ORDER BY captured_at DESC"
    );
  }

  async getById(id: string): Promise<AbandonedLeadRow | null> {
    const rows = await this.sql.unsafe<AbandonedLeadRow[]>("SELECT * FROM abandoned_leads WHERE id = $1::uuid", [id]);
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM abandoned_leads WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }
}
