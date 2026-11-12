import postgres from "postgres";
import type { ProductRow } from "./types";

type Sql = postgres.Sql<{}>;

export class ProductRepository {
  constructor(private sql: Sql) {}

  async list(filters: { ventureId?: string; page?: number; pageSize?: number } = {}): Promise<{ products: ProductRow[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const { ventureId, page = 1, pageSize = 50 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (ventureId) {
      conditions.push(`venture_id = $${params.length + 1}::uuid`);
      params.push(ventureId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM products ${where}`, params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<ProductRow[]>(
      `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { products: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<ProductRow | null> {
    const rows = await this.sql.unsafe<ProductRow[]>("SELECT * FROM products WHERE id = $1::uuid", [id]);
    return rows[0] ?? null;
  }

  async create(data: Record<string, unknown>): Promise<ProductRow> {
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
    const rows = await this.sql.unsafe<ProductRow[]>(
      `INSERT INTO products (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING *`,
      vals
    );
    return rows[0]!;
  }

  async update(id: string, data: Record<string, unknown>): Promise<ProductRow | null> {
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

    const rows = await this.sql.unsafe<ProductRow[]>(
      `UPDATE products SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM products WHERE id = $1::uuid RETURNING id", [id]
    );
    return result.length > 0;
  }
}
