import postgres from "postgres";
import type {
  FinanceInvoiceFilters,
  FinanceInvoiceRow,
  FinanceInvoiceListResponse,
  InvoiceLineItem,
} from "./types";
import { resolveBdtConversion, round2 } from "./currency";

type Sql = postgres.Sql<{}>;

interface RawLineItem {
  description?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  unit_price?: unknown;
  total?: unknown;
}

export function normalizeLineItems(items: unknown): InvoiceLineItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const item = (raw ?? {}) as RawLineItem;
    const quantity = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
    return {
      description: typeof item.description === "string" ? item.description : "",
      quantity,
      unitPrice,
      total: round2(quantity * unitPrice),
    };
  });
}

function parseLineItems(value: unknown): InvoiceLineItem[] {
  let v: unknown = value;
  if (typeof v === "string") {
    try { v = JSON.parse(v); } catch { return []; }
  }
  return normalizeLineItems(v);
}

function withParsedLineItems<T extends FinanceInvoiceRow>(row: T): T {
  return { ...row, lineItems: parseLineItems(row.lineItems) };
}

function invoiceDatePrefix(issuedDate: string | null | undefined): string {
  let year: number;
  let month: number;
  let day: number;

  if (issuedDate) {
    // issued_date is a plain date (YYYY-MM-DD); parse parts directly to
    // avoid timezone shifts from Date parsing.
    const parts = issuedDate.split("-").map((part) => Number(part));
    year = parts[0] ?? 0;
    month = parts[1] ?? 0;
    day = parts[2] ?? 0;
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
    day = now.getDate();
  }

  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const yy = String(year).slice(-2).padStart(2, "0");
  return `${dd}${mm}${yy}`;
}

// Explicit column list with camelCase aliases: postgres.js returns raw
// column names, and callers (dashboard pages, API consumers) expect the
// camelCase shape declared in ./types. SELECT * broke that contract
// (amount_bdt arrived as amount_bdt, pages read amountBdt -> NaN).
const INVOICE_COLUMNS = 'id, invoice_number AS "invoiceNumber", source_type AS "sourceType", source_id AS "sourceId", client_id AS "clientId", line_items AS "lineItems", subtotal, discount, total, total_bdt AS "totalBdt", currency, exchange_rate AS "exchangeRate", status, issued_date AS "issuedDate", due_date AS "dueDate", notes, pdf_url AS "pdfUrl", created_by AS "createdBy", created_at AS "createdAt"';

export class FinanceInvoiceRepository {
  constructor(private sql: Sql) {}

  async list(filters: FinanceInvoiceFilters = {}): Promise<FinanceInvoiceListResponse> {
    const { status, sourceType, sourceId, clientId, page = 1, pageSize = 20 } = filters;
    const conditions: string[] = [];
    const params: postgres.ParameterOrJSON<never>[] = [];

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      conditions.push(`status = ANY($${params.length + 1}::text[])`);
      params.push(statuses as any);
    }
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

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;

    const countResult = await this.sql.unsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int as total FROM finance_invoices ${where}`,
      params.length > 0 ? params : undefined
    );
    const total = Number(countResult[0]?.total ?? 0);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await this.sql.unsafe<FinanceInvoiceRow[]>(
      `SELECT ${INVOICE_COLUMNS} FROM finance_invoices ${where} ORDER BY issued_date DESC NULLS LAST, created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, pageSize, offset]
    );

    return { invoices: rows.map(withParsedLineItems), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<FinanceInvoiceRow | null> {
    const rows = await this.sql.unsafe<FinanceInvoiceRow[]>(
      `SELECT ${INVOICE_COLUMNS} FROM finance_invoices WHERE id = $1::uuid`,
      [id]
    );
    return rows[0] ? withParsedLineItems(rows[0]) : null;
  }

  async getByNumber(invoiceNumber: string): Promise<FinanceInvoiceRow | null> {
    const rows = await this.sql.unsafe<FinanceInvoiceRow[]>(
      `SELECT ${INVOICE_COLUMNS} FROM finance_invoices WHERE invoice_number = $1`,
      [invoiceNumber]
    );
    return rows[0] ? withParsedLineItems(rows[0]) : null;
  }

  async generateInvoiceNumber(issuedDate?: string | null): Promise<string> {
    const prefix = `INV-${invoiceDatePrefix(issuedDate)}-`;
    const rows = await this.sql.unsafe<{ total: number }[]>(
      "SELECT COUNT(*)::int as total FROM finance_invoices WHERE invoice_number LIKE $1",
      [`${prefix}%`]
    );
    const serial = Number(rows[0]?.total ?? 0) + 1;
    return `${prefix}${String(serial).padStart(4, "0")}`;
  }

  async create(data: Record<string, unknown>): Promise<FinanceInvoiceRow> {
    const lineItems = normalizeLineItems(data.lineItems);
    const subtotal = round2(lineItems.reduce((sum, item) => sum + item.total, 0));
    const discount = data.discount === undefined || data.discount === null ? 0 : Number(data.discount);
    const total = round2(subtotal - discount);

    const conversion = resolveBdtConversion(
      data.currency as string | undefined,
      total,
      data.exchangeRate as string | number | undefined
    );

    const invoiceNumber =
      typeof data.invoiceNumber === "string" && data.invoiceNumber
        ? data.invoiceNumber
        : await this.generateInvoiceNumber(data.issuedDate as string | undefined);

    const payload: Record<string, unknown> = {
      ...data,
      invoiceNumber,
      lineItems: JSON.stringify(lineItems),
      subtotal,
      discount,
      total,
      currency: conversion.currency,
      exchangeRate: conversion.exchangeRate,
      totalBdt: conversion.amountBdt,
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
    const rows = await this.sql.unsafe<FinanceInvoiceRow[]>(
      `INSERT INTO finance_invoices (${cols.join(", ")}) VALUES (${ph.join(", ")}) RETURNING ${INVOICE_COLUMNS}`,
      vals
    );
    return withParsedLineItems(rows[0]!);
  }

  async update(id: string, data: Record<string, unknown>): Promise<FinanceInvoiceRow | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const payload: Record<string, unknown> = { ...data };
    let totalsChanged = false;

    if (data.lineItems !== undefined) {
      const lineItems = normalizeLineItems(data.lineItems);
      const subtotal = round2(lineItems.reduce((sum, item) => sum + item.total, 0));
      const discount =
        data.discount === undefined ? Number(existing.discount ?? 0) : Number(data.discount ?? 0);
      payload.lineItems = JSON.stringify(lineItems);
      payload.subtotal = subtotal;
      payload.discount = discount;
      payload.total = round2(subtotal - discount);
      totalsChanged = true;
    } else if (data.discount !== undefined && existing.subtotal !== null) {
      const discount = Number(data.discount ?? 0);
      payload.total = round2(Number(existing.subtotal) - discount);
      totalsChanged = true;
    }

    // Keep total_bdt consistent whenever money fields change.
    if (totalsChanged || data.currency !== undefined || data.exchangeRate !== undefined) {
      const effectiveTotal =
        payload.total !== undefined ? Number(payload.total) : Number(existing.total ?? 0);
      const conversion = resolveBdtConversion(
        (data.currency as string | undefined) ?? existing.currency,
        effectiveTotal,
        (data.exchangeRate as string | number | undefined) ?? existing.exchangeRate
      );
      payload.currency = conversion.currency;
      payload.exchangeRate = conversion.exchangeRate;
      payload.totalBdt = conversion.amountBdt;
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

    const rows = await this.sql.unsafe<FinanceInvoiceRow[]>(
      `UPDATE finance_invoices SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING ${INVOICE_COLUMNS}`,
      vals
    );
    return rows[0] ? withParsedLineItems(rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql.unsafe<{ id: string }[]>(
      "DELETE FROM finance_invoices WHERE id = $1::uuid RETURNING id",
      [id]
    );
    return result.length > 0;
  }

  async setStatus(id: string, status: string): Promise<FinanceInvoiceRow | null> {
    const rows = await this.sql.unsafe<FinanceInvoiceRow[]>(
      `UPDATE finance_invoices SET status = $1 WHERE id = $2::uuid RETURNING ${INVOICE_COLUMNS}`,
      [status, id]
    );
    return rows[0] ? withParsedLineItems(rows[0]) : null;
  }
}
