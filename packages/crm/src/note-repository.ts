import postgres from "postgres";

type Sql = postgres.Sql<{}>;

export interface NoteRow {
  id: string;
  leadId: string;
  note: string;
  isInternal: boolean;
  createdBy: string | null;
  createdAt: string;
}

export class NoteRepository {
  constructor(private sql: Sql) {}

  async create(leadId: string, note: string, createdBy?: string | null, isInternal = true): Promise<NoteRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<NoteRow[]>(
      `INSERT INTO lead_notes (id, lead_id, note, is_internal, created_by) VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid) RETURNING *`,
      [id, leadId, note, isInternal, createdBy ?? null]
    );
    return rows[0]!;
  }

  async update(id: string, note: string): Promise<NoteRow | null> {
    const rows = await this.sql.unsafe<NoteRow[]>(
      "UPDATE lead_notes SET note = $1 WHERE id = $2::uuid RETURNING *",
      [note, id]
    );
    return rows[0] ?? null;
  }

  async getByLeadId(leadId: string): Promise<NoteRow[]> {
    return this.sql.unsafe<NoteRow[]>(
      "SELECT * FROM lead_notes WHERE lead_id = $1::uuid ORDER BY created_at DESC",
      [leadId]
    );
  }

  async getById(id: string): Promise<NoteRow | null> {
    const rows = await this.sql.unsafe<NoteRow[]>("SELECT * FROM lead_notes WHERE id = $1::uuid", [id]);
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM lead_notes WHERE id = $1::uuid RETURNING id",
      [id]
    );
    return result.length > 0;
  }
}
