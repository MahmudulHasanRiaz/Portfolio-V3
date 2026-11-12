import postgres from "postgres";
import type { CategoryRow } from "./types";

type Sql = postgres.Sql<{}>;

export class CategoryRepository {
  constructor(private sql: Sql) {}

  async list(): Promise<CategoryRow[]> {
    return this.sql.unsafe<CategoryRow[]>("SELECT * FROM venture_categories ORDER BY name ASC");
  }

  async getById(id: string): Promise<CategoryRow | null> {
    const rows = await this.sql.unsafe<CategoryRow[]>("SELECT * FROM venture_categories WHERE id = $1::uuid", [id]);
    return rows[0] ?? null;
  }

  async create(data: { name: string; slug: string; description?: string }): Promise<CategoryRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const rows = await this.sql.unsafe<CategoryRow[]>(
      "INSERT INTO venture_categories (id, name, slug, description) VALUES ($1::uuid, $2, $3, $4) RETURNING *",
      [id, data.name, data.slug, data.description ?? null]
    );
    return rows[0]!;
  }

  async update(id: string, data: { name?: string; slug?: string; description?: string }): Promise<CategoryRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];

    if (data.name !== undefined) { sets.push(`name = $${vals.length + 1}`); vals.push(data.name); }
    if (data.slug !== undefined) { sets.push(`slug = $${vals.length + 1}`); vals.push(data.slug); }
    if (data.description !== undefined) { sets.push(`description = $${vals.length + 1}`); vals.push(data.description); }

    if (sets.length === 0) return this.getById(id);
    vals.push(id);

    const rows = await this.sql.unsafe<CategoryRow[]>(
      `UPDATE venture_categories SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM venture_categories WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }
}
