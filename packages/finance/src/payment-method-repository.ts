import postgres from "postgres";
import type { PaymentMethodFilters, PaymentMethodRow, PaymentMethodListResponse } from "./types";

type Sql = postgres.Sql<{}>;

// Explicit column list with camelCase aliases: postgres.js returns raw
// column names, and callers (dashboard pages, API consumers) expect the
// camelCase shape declared in ./types. SELECT * broke that contract
// (amount_bdt arrived as amount_bdt, pages read amountBdt -> NaN).
const PAYMENT_METHOD_COLUMNS = 'id, name, type, is_active AS "isActive", created_at AS "createdAt"';

export class PaymentMethodRepository {
  constructor(private sql: Sql) {}

  async list(filters: PaymentMethodFilters = {}): Promise<PaymentMethodListResponse> {
    const { onlyActive, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (onlyActive) {
      conditions.push("is_active = true");
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM payment_methods ${where}`,
      params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<PaymentMethodRow[]>(
      `SELECT ${PAYMENT_METHOD_COLUMNS} FROM payment_methods ${where} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { paymentMethods: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<PaymentMethodRow | null> {
    const rows = await this.sql.unsafe<PaymentMethodRow[]>(
      `SELECT ${PAYMENT_METHOD_COLUMNS} FROM payment_methods WHERE id = $1::uuid`,
      [id]
    );
    return rows[0] ?? null;
  }

  async create(data: Record<string, unknown>): Promise<PaymentMethodRow> {
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
    const rows = await this.sql.unsafe<PaymentMethodRow[]>(
      `INSERT INTO payment_methods (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING ${PAYMENT_METHOD_COLUMNS}`,
      vals
    );
    return rows[0]!;
  }

  async update(id: string, data: Record<string, unknown>): Promise<PaymentMethodRow | null> {
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

    const rows = await this.sql.unsafe<PaymentMethodRow[]>(
      `UPDATE payment_methods SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING ${PAYMENT_METHOD_COLUMNS}`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM payment_methods WHERE id = $1::uuid RETURNING id",
      [id]
    );
    return result.length > 0;
  }
}
