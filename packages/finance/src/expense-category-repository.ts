import postgres from "postgres";
import type { ExpenseCategoryFilters, ExpenseCategoryRow, ExpenseCategoryListResponse } from "./types";

type Sql = postgres.Sql<{}>;

export function slugifyCategoryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Explicit column list with camelCase aliases: postgres.js returns raw
// column names, and callers (dashboard pages, API consumers) expect the
// camelCase shape declared in ./types. SELECT * broke that contract
// (amount_bdt arrived as amount_bdt, pages read amountBdt -> NaN).
const EXPENSE_CATEGORY_COLUMNS = 'id, name, slug, description, color, icon, is_active AS "isActive", created_at AS "createdAt"';

export class ExpenseCategoryRepository {
  constructor(private sql: Sql) {}

  async list(filters: ExpenseCategoryFilters = {}): Promise<ExpenseCategoryListResponse> {
    const { onlyActive, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (onlyActive) {
      conditions.push("is_active = true");
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM expense_categories ${where}`,
      params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<ExpenseCategoryRow[]>(
      `SELECT ${EXPENSE_CATEGORY_COLUMNS} FROM expense_categories ${where} ORDER BY name ASC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { expenseCategories: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<ExpenseCategoryRow | null> {
    const rows = await this.sql.unsafe<ExpenseCategoryRow[]>(
      `SELECT ${EXPENSE_CATEGORY_COLUMNS} FROM expense_categories WHERE id = $1::uuid`,
      [id]
    );
    return rows[0] ?? null;
  }

  async getBySlug(slug: string): Promise<ExpenseCategoryRow | null> {
    const rows = await this.sql.unsafe<ExpenseCategoryRow[]>(
      `SELECT ${EXPENSE_CATEGORY_COLUMNS} FROM expense_categories WHERE slug = $1`,
      [slug]
    );
    return rows[0] ?? null;
  }

  async create(data: Record<string, unknown>): Promise<ExpenseCategoryRow> {
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const now = new Date().toISOString();
    const cols: string[] = ["id", "created_at"];
    const vals: postgres.ParameterOrJSON<never>[] = [id, now];

    const payload: Record<string, unknown> = { ...data };
    if (!payload.slug && typeof payload.name === "string") {
      payload.slug = slugifyCategoryName(payload.name);
    }

    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      cols.push(dbCol);
      vals.push(value as any);
    }

    const ph = cols.map((_, i) => `$${i + 1}`);
    const rows = await this.sql.unsafe<ExpenseCategoryRow[]>(
      `INSERT INTO expense_categories (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING ${EXPENSE_CATEGORY_COLUMNS}`,
      vals
    );
    return rows[0]!;
  }

  async update(id: string, data: Record<string, unknown>): Promise<ExpenseCategoryRow | null> {
    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];

    const payload: Record<string, unknown> = { ...data };

    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      sets.push(`${dbCol} = $${vals.length + 1}`);
      vals.push(value as any);
    }

    if (sets.length === 0) return this.getById(id);
    vals.push(id);

    const rows = await this.sql.unsafe<ExpenseCategoryRow[]>(
      `UPDATE expense_categories SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING ${EXPENSE_CATEGORY_COLUMNS}`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM expense_categories WHERE id = $1::uuid RETURNING id",
      [id]
    );
    return result.length > 0;
  }
}
