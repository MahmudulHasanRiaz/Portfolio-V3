import postgres from "postgres";
import type { FinancePaymentFilters, FinancePaymentRow, FinancePaymentListResponse } from "./types";
import { resolveBdtConversion } from "./currency";

type Sql = postgres.Sql<{}>;

// Explicit column list with camelCase aliases: postgres.js returns raw
// column names, and callers (dashboard pages, API consumers) expect the
// camelCase shape declared in ./types. SELECT * broke that contract
// (amount_bdt arrived as amount_bdt, pages read amountBdt -> NaN).
const PAYMENT_COLUMNS = 'id, source_type AS "sourceType", source_id AS "sourceId", client_id AS "clientId", amount, currency, exchange_rate AS "exchangeRate", amount_bdt AS "amountBdt", payment_method_id AS "paymentMethodId", payment_date AS "paymentDate", payment_type AS "paymentType", notes, invoice_id AS "invoiceId", created_by AS "createdBy", created_at AS "createdAt"';

export class FinancePaymentRepository {
  constructor(private sql: Sql) {}

  async list(filters: FinancePaymentFilters = {}): Promise<FinancePaymentListResponse> {
    const { sourceType, sourceId, clientId, invoiceId, paymentMethodId, dateFrom, dateTo, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (sourceType) {
      conditions.push(`source_type = $${params.length + 1}`);
      params.push(sourceType);
    }
    if (sourceId) {
      conditions.push(`source_id = $${params.length + 1}::uuid`);
      params.push(sourceId);
    }
    if (clientId) {
      conditions.push(`client_id = $${params.length + 1}::uuid`);
      params.push(clientId);
    }
    if (invoiceId) {
      conditions.push(`invoice_id = $${params.length + 1}::uuid`);
      params.push(invoiceId);
    }
    if (paymentMethodId) {
      conditions.push(`payment_method_id = $${params.length + 1}::uuid`);
      params.push(paymentMethodId);
    }
    if (dateFrom) {
      conditions.push(`payment_date >= $${params.length + 1}::date`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`payment_date <= $${params.length + 1}::date`);
      params.push(dateTo);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM finance_payments ${where}`,
      params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<FinancePaymentRow[]>(
      `SELECT ${PAYMENT_COLUMNS} FROM finance_payments ${where} ORDER BY payment_date DESC NULLS LAST, created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { payments: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<FinancePaymentRow | null> {
    const rows = await this.sql.unsafe<FinancePaymentRow[]>(
      `SELECT ${PAYMENT_COLUMNS} FROM finance_payments WHERE id = $1::uuid`,
      [id]
    );
    return rows[0] ?? null;
  }

  async listByInvoice(invoiceId: string): Promise<FinancePaymentRow[]> {
    return this.sql.unsafe<FinancePaymentRow[]>(
      `SELECT ${PAYMENT_COLUMNS} FROM finance_payments WHERE invoice_id = $1::uuid ORDER BY payment_date DESC NULLS LAST, created_at DESC`,
      [invoiceId]
    );
  }

  async create(data: Record<string, unknown>): Promise<FinancePaymentRow> {
    const conversion = resolveBdtConversion(
      data.currency as string | undefined,
      data.amount as string | number | undefined,
      data.exchangeRate as string | number | undefined
    );

    const payload: Record<string, unknown> = {
      ...data,
      currency: conversion.currency,
      exchangeRate: conversion.exchangeRate,
      amountBdt: conversion.amountBdt,
    };

    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    const now = new Date().toISOString();
    const cols: string[] = ["id", "created_at"];
    const vals: postgres.ParameterOrJSON<never>[] = [id, now];

    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      cols.push(dbCol);
      vals.push(value as any);
    }

    const ph = cols.map((_, i) => `$${i + 1}`);
    const rows = await this.sql.unsafe<FinancePaymentRow[]>(
      `INSERT INTO finance_payments (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING ${PAYMENT_COLUMNS}`,
      vals
    );
    return rows[0]!;
  }

  async update(id: string, data: Record<string, unknown>): Promise<FinancePaymentRow | null> {
    const payload: Record<string, unknown> = { ...data };

    // Keep amount_bdt consistent whenever amount, currency or rate changes.
    if (data.amount !== undefined || data.currency !== undefined || data.exchangeRate !== undefined) {
      const existing = await this.getById(id);
      if (!existing) return null;
      const conversion = resolveBdtConversion(
        (data.currency as string | undefined) ?? existing.currency,
        (data.amount as string | number | undefined) ?? existing.amount,
        (data.exchangeRate as string | number | undefined) ?? existing.exchangeRate
      );
      payload.currency = conversion.currency;
      payload.exchangeRate = conversion.exchangeRate;
      payload.amountBdt = conversion.amountBdt;
    }

    const sets: string[] = [];
    const vals: postgres.ParameterOrJSON<never>[] = [];

    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || key === "id" || key === "createdAt") continue;
      const dbCol = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      sets.push(`${dbCol} = $${vals.length + 1}`);
      vals.push(value as any);
    }

    if (sets.length === 0) return this.getById(id);
    vals.push(id);

    const rows = await this.sql.unsafe<FinancePaymentRow[]>(
      `UPDATE finance_payments SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING ${PAYMENT_COLUMNS}`,
      vals
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM finance_payments WHERE id = $1::uuid RETURNING id",
      [id]
    );
    return result.length > 0;
  }

  async totalReceivedBdt(sourceType: string, sourceId: string): Promise<number> {
    const rows = await this.sql.unsafe<{ total: string }[]>(
      "SELECT COALESCE(SUM(amount_bdt), 0) as total FROM finance_payments WHERE source_type = $1 AND source_id = $2::uuid",
      [sourceType, sourceId]
    );
    return Number(rows[0]?.total ?? 0);
  }
}
