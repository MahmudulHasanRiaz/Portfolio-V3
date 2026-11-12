// Admin finance CRUD — Hono port of the Next.js admin REST routes under
// apps/admin/src/app/api/finance/:
//   expense-categories, expenses, invoices (+ /status), payment-methods,
//   payments, summary.
// Mounted at /finance by the coordinator (see routes/admin/index.ts).
//
// Fidelity notes:
// - Response shapes match the Next.js routes exactly: lists return
//   { <key>, total, page, pageSize, totalPages } (key is expenseCategories /
//   expenses / invoices / paymentMethods / payments); get/create/update
//   return the bare row; delete returns { success: true }. 404 messages
//   ("Expense category not found", "Expense not found", "Invoice not
//   found", "Payment method not found", "Payment not found") are preserved.
// - The sources ran through createFinanceRepositories (@repo/finance,
//   postgres.js over the shared getSql() singleton — TCP, Workers-
//   incompatible). The repository logic is re-implemented here with direct
//   Drizzle over the Neon HTTP db (getApiDb): explicit column handling is
//   unnecessary because Drizzle rows are already keyed by the schema's
//   camelCase property names, so no case conversion is applied.
// - Validation mirrors the @repo/validation finance.ts Zod schemas
//   field-for-field (local copies — apps/api does not depend on
//   @repo/validation). A failed parse returns the first issue's message
//   with 400, exactly as the sources. `createdBy` is never taken from the
//   body: it is stamped from the session user, as in the sources.
// - Money logic mirrors packages/finance/src/currency.ts + the
//   repositories: BDT is the base currency; non-BDT amounts require an
//   exchange rate (400 "Exchange rate is required for ..."), amountBdt /
//   totalBdt are always computed server-side, never trusted from the
//   client. Expenses snapshot the category name into the legacy `category`
//   text column when categoryId is given (unknown categoryId -> 404, as
//   the repository's ExpenseCategoryNotFoundError mapped in the source).
// - Invoices: line items are normalised (quantity defaults to 1, total =
//   round2(quantity * unitPrice)), subtotal/total/totalBdt are computed,
//   invoiceNumber auto-generates as INV-DDMMYY-serial (count of existing
//   numbers with the same prefix + 1, zero-padded to 4) when not provided.
//   PUT recomputes totals exactly as FinanceInvoiceRepository.update does.
// - A duplicate `slug` on expense categories returns 409 with the
//   friendly message, as in the sources.
// - Create skips null values (so DB defaults apply); update sets nulls;
//   a PUT with no updatable fields returns the existing row, as in the
//   repositories. `id` / `createdAt` / `createdBy` are never taken from
//   the body.
//
// NOT ported: POST /invoices/:id/pdf — it uses pdfkit (Node-only:
// Buffer/streams) plus R2 storage via @/lib/pdf, which cannot run on
// Cloudflare Workers. It needs a Workers-compatible PDF path or a
// Node-runtime service; the route is intentionally absent here.
//
// TODO (cutover wiring, deliberately NOT done here): the sources also
// dispatched workflow triggers — dispatchTrigger(dbUrl, "invoice_paid",
// ...) when an invoice status becomes "paid", and
// dispatchTrigger(dbUrl, "payment_received", ...) after a payment is
// created — isolated so a workflow failure never fails the API call.
// Those will be wired at cutover; the TODO markers below show where each
// call belongs. Finance routes never purge the public cache and never
// touch the search index in the sources, so there is nothing else to wire.
import { Hono, type Context } from "hono";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  inArray,
  isNotNull,
  like,
  lte,
  sql,
  sum,
} from "drizzle-orm";
import { z } from "zod";
import {
  expenseCategories,
  expenseSourceType,
  financeExpenses,
  financeInvoices,
  financePayments,
  invoiceStatus,
  paymentMethods,
  paymentSourceType,
} from "@repo/database/schema";
import { getApiDb, type ApiDb } from "../../db";
import { requireAuth } from "../../lib/admin-auth";

const app = new Hono();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** An error that maps to a non-500 HTTP status (mirrors FinanceError's
 *  code -> status mapping in the Next.js routes: *_NOT_FOUND -> 404,
 *  other finance errors -> 400). */
function fail(status: 400 | 404, message: string): Error {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

function errorResponse(
  c: Context,
  err: unknown,
  fallback: string,
  duplicateMessage?: string,
): Response {
  if (err instanceof Error) {
    const status = (err as Error & { status?: unknown }).status;
    if (status === 400) return c.json({ error: err.message }, 400);
    if (status === 404) return c.json({ error: err.message }, 404);
    // `slug` is unique: surface a readable message instead of the raw
    // Postgres "duplicate key value violates unique constraint" text.
    if (duplicateMessage && /duplicate key value/i.test(err.message)) {
      return c.json({ error: duplicateMessage }, 409);
    }
  }
  return c.json({ error: errorMessage(err, fallback) }, 500);
}

function parsePage(query: (name: string) => string | undefined): {
  page: number;
  pageSize: number;
} {
  const page = parseInt(query("page") ?? "1", 10);
  const pageSize = parseInt(query("pageSize") ?? "20", 10);
  return {
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
    pageSize:
      Number.isFinite(pageSize) && pageSize >= 1
        ? Math.floor(pageSize)
        : 20,
  };
}

/**
 * Map a request body to table insert/update values. Mirrors the finance
 * repositories' dynamic column handling: only known columns, `id` /
 * `createdAt` / `createdBy` never taken from the body, unknown keys
 * dropped. With skipNulls (create) null values are dropped so DB defaults
 * apply; without it (update) nulls are set, as in the repositories.
 */
function tableFields(
  table: Parameters<typeof getTableColumns>[0],
  body: Record<string, unknown>,
  skipNulls: boolean,
): Record<string, unknown> {
  const columns = getTableColumns(table);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (
      key === "id" ||
      key === "createdAt" ||
      key === "updatedAt" ||
      key === "createdBy"
    ) {
      continue;
    }
    if (!(key in columns)) continue;
    if (value === undefined) continue;
    if (value === null && skipNulls) continue;
    out[key] = value;
  }
  return out;
}

/** packages/finance/src/currency.ts — pure, no Node dependency. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function resolveBdtConversion(
  currencyInput: string | null | undefined,
  amount: string | number | null | undefined,
  exchangeRateInput: string | number | null | undefined,
): { currency: string; exchangeRate: number; amountBdt: number } {
  const currency = (currencyInput ?? "BDT").toUpperCase();
  const value = Number(amount ?? 0);
  if (currency === "BDT") {
    return { currency, exchangeRate: 1, amountBdt: round2(value) };
  }
  const rate =
    exchangeRateInput === null ||
    exchangeRateInput === undefined ||
    exchangeRateInput === ""
      ? NaN
      : Number(exchangeRateInput);
  if (!rate || Number.isNaN(rate)) {
    throw fail(
      400,
      `Exchange rate is required for ${currency} transactions (base currency is BDT)`,
    );
  }
  return { currency, exchangeRate: rate, amountBdt: round2(value * rate) };
}

function slugifyCategoryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Invoices: line items + invoice numbers ──────────────────────────────────
// Mirrors packages/finance/src/invoice-repository.ts.

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

function normalizeLineItems(items: unknown): InvoiceLineItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const quantity = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
    return {
      description:
        typeof item.description === "string" ? item.description : "",
      quantity,
      unitPrice,
      total: round2(quantity * unitPrice),
    };
  });
}

function parseLineItems(value: unknown): InvoiceLineItem[] {
  let v: unknown = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  return normalizeLineItems(v);
}

type InvoiceRow = typeof financeInvoices.$inferSelect;

function withParsedLineItems(row: InvoiceRow): InvoiceRow {
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

async function generateInvoiceNumber(
  db: ApiDb,
  issuedDate?: string | null,
): Promise<string> {
  const prefix = `INV-${invoiceDatePrefix(issuedDate)}-`;
  const [row] = await db
    .select({ total: count() })
    .from(financeInvoices)
    .where(like(financeInvoices.invoiceNumber, `${prefix}%`));
  const serial = Number(row?.total ?? 0) + 1;
  return `${prefix}${String(serial).padStart(4, "0")}`;
}

// ─── Expenses: category snapshot ─────────────────────────────────────────────

async function resolveCategoryName(
  db: ApiDb,
  categoryId: string,
): Promise<string> {
  const [row] = await db
    .select({ name: expenseCategories.name })
    .from(expenseCategories)
    .where(eq(expenseCategories.id, categoryId))
    .limit(1);
  if (!row) throw fail(404, `Expense category not found: ${categoryId}`);
  return row.name ?? "";
}

// ─── Validation ──────────────────────────────────────────────────────────────
// Local copies of the @repo/validation finance.ts schemas (apps/api does
// not depend on @repo/validation). Create schemas omit `createdBy` — it is
// stamped from the session, never taken from the body.

const uuidSchema = z.string().uuid();
const slugSchema = z.string().min(1).max(255).regex(/^[a-z0-9-]+$/);
const timestampSchema = z.string().datetime();
const paymentMethodTypeSchema = z.enum([
  "mobile_banking",
  "bank",
  "cash",
  "international",
]);
const expenseSourceTypeSchema = z.enum([
  "freelance_project",
  "artist_event",
  "general",
]);
const paymentSourceTypeSchema = z.enum([
  "freelance_project",
  "artist_event",
]);
const paymentTypeSchema = z.enum([
  "advance",
  "installment",
  "final",
  "full",
]);
const invoiceStatusSchema = z.enum(["draft", "sent", "paid", "cancelled"]);

const expenseCategorySchema = z.object({
  id: uuidSchema,
  name: z.string().max(100),
  slug: slugSchema,
  description: z.string().optional(),
  color: z.string().max(7).optional(),
  icon: z.string().optional(),
  isActive: z.boolean(),
  createdAt: timestampSchema,
});
const createExpenseCategorySchema = z.object({
  name: z.string().max(100),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  color: z.string().max(7).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});
const updateExpenseCategorySchema = expenseCategorySchema.partial();

const paymentMethodSchema = z.object({
  id: uuidSchema,
  name: z.string().max(100),
  type: paymentMethodTypeSchema,
  isActive: z.boolean(),
  createdAt: timestampSchema,
});
const createPaymentMethodSchema = z.object({
  name: z.string().max(100),
  type: paymentMethodTypeSchema,
  isActive: z.boolean(),
});
const updatePaymentMethodSchema = paymentMethodSchema.partial();

const financePaymentSchema = z.object({
  id: uuidSchema,
  sourceType: paymentSourceTypeSchema,
  sourceId: uuidSchema,
  clientId: uuidSchema,
  amount: z.coerce.number(),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  amountBdt: z.coerce.number().optional(),
  paymentMethodId: uuidSchema,
  paymentDate: z.string(),
  paymentType: paymentTypeSchema,
  notes: z.string().optional(),
  invoiceId: uuidSchema.optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});
const createFinancePaymentSchema = z.object({
  sourceType: paymentSourceTypeSchema,
  sourceId: uuidSchema,
  clientId: uuidSchema,
  amount: z.coerce.number(),
  currency: z.string().max(10),
  // Required by the repository when currency is not BDT (base currency);
  // amountBdt is always computed by the repository, never sent by clients.
  exchangeRate: z.coerce.number().optional(),
  paymentMethodId: uuidSchema,
  paymentDate: z.string(),
  paymentType: paymentTypeSchema,
  notes: z.string().optional(),
  invoiceId: uuidSchema.optional(),
});
const updateFinancePaymentSchema = financePaymentSchema.partial();

const financeExpenseSchema = z.object({
  id: uuidSchema,
  sourceType: expenseSourceTypeSchema,
  sourceId: uuidSchema.optional(),
  category: z.string().optional(),
  categoryId: uuidSchema.optional(),
  description: z.string(),
  amount: z.coerce.number(),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  amountBdt: z.coerce.number().optional(),
  paymentMethodId: uuidSchema,
  expenseDate: z.string(),
  receiptUrl: z.string().optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});
const createFinanceExpenseSchema = z.object({
  sourceType: expenseSourceTypeSchema,
  sourceId: uuidSchema.optional(),
  // Optional: when categoryId is given the repository snapshots the
  // category name into `category`; amountBdt is computed by the repository.
  category: z.string().optional(),
  categoryId: uuidSchema.optional(),
  description: z.string(),
  amount: z.coerce.number(),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  paymentMethodId: uuidSchema,
  expenseDate: z.string(),
  receiptUrl: z.string().optional(),
});
const updateFinanceExpenseSchema = financeExpenseSchema.partial();

const invoiceLineItemSchema = z.object({
  description: z.string(),
  quantity: z.coerce.number(),
  unitPrice: z.coerce.number(),
  // Computed by the repository from quantity * unitPrice when creating.
  total: z.coerce.number().optional(),
});
const financeInvoiceSchema = z.object({
  id: uuidSchema,
  invoiceNumber: z.string().max(50),
  sourceType: paymentSourceTypeSchema,
  sourceId: uuidSchema,
  clientId: uuidSchema,
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.coerce.number(),
      unitPrice: z.coerce.number(),
      total: z.coerce.number(),
    }),
  ),
  subtotal: z.coerce.number(),
  discount: z.coerce.number().optional(),
  total: z.coerce.number(),
  totalBdt: z.coerce.number().optional(),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  status: invoiceStatusSchema,
  issuedDate: z.string(),
  dueDate: z.string(),
  notes: z.string().optional(),
  pdfUrl: z.string().optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});
const createFinanceInvoiceSchema = z.object({
  // invoiceNumber is auto-generated by the repository (INV-DDMMYY-serial)
  // when not provided; subtotal/total/totalBdt are always computed there.
  invoiceNumber: z.string().max(50).optional(),
  sourceType: paymentSourceTypeSchema,
  sourceId: uuidSchema,
  clientId: uuidSchema,
  lineItems: z.array(invoiceLineItemSchema),
  discount: z.coerce.number().optional(),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  status: invoiceStatusSchema.optional(),
  issuedDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  pdfUrl: z.string().optional(),
});
const updateFinanceInvoiceSchema = financeInvoiceSchema.partial();

/** First Zod issue message, exactly as the Next.js routes return it. */
function invalidBody(parsed: { error: z.ZodError }): string {
  return parsed.error.issues[0]?.message ?? "Invalid request body";
}

// ─── Expense categories ──────────────────────────────────────────────────────

const CATEGORY_DUPLICATE_MESSAGE =
  "A category with this slug already exists. Choose a different slug.";

app.get("/expense-categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const onlyActive = c.req.query("onlyActive") === "true";
    const { page, pageSize } = parsePage((name) => c.req.query(name));
    const db = getApiDb();
    const where = onlyActive
      ? eq(expenseCategories.isActive, true)
      : undefined;
    const [countRow] = await db
      .select({ total: count() })
      .from(expenseCategories)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(expenseCategories)
      .where(where)
      .orderBy(asc(expenseCategories.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({
      expenseCategories: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch expense categories");
  }
});

app.post("/expense-categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = createExpenseCategorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const data = tableFields(expenseCategories, parsed.data, true);
    if (!data.slug && typeof data.name === "string") {
      data.slug = slugifyCategoryName(data.name);
    }
    const [row] = await db
      .insert(expenseCategories)
      .values(data as typeof expenseCategories.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create" }, 500);
    return c.json(row, 201);
  } catch (err) {
    return errorResponse(
      c,
      err,
      "Failed to create",
      CATEGORY_DUPLICATE_MESSAGE,
    );
  }
});

app.get("/expense-categories/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.id, c.req.param("id")))
      .limit(1);
    if (!row) {
      return c.json({ error: "Expense category not found" }, 404);
    }
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch");
  }
});

app.put("/expense-categories/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = updateExpenseCategorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const [existing] = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.id, id))
      .limit(1);
    if (!existing) {
      return c.json({ error: "Expense category not found" }, 404);
    }
    const fields = tableFields(expenseCategories, parsed.data, false);
    if (Object.keys(fields).length === 0) return c.json(existing);
    const [row] = await db
      .update(expenseCategories)
      .set(fields as typeof expenseCategories.$inferInsert)
      .where(eq(expenseCategories.id, id))
      .returning();
    if (!row) {
      return c.json({ error: "Expense category not found" }, 404);
    }
    return c.json(row);
  } catch (err) {
    return errorResponse(
      c,
      err,
      "Failed to update",
      CATEGORY_DUPLICATE_MESSAGE,
    );
  }
});

app.delete("/expense-categories/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const deleted = await db
      .delete(expenseCategories)
      .where(eq(expenseCategories.id, c.req.param("id")))
      .returning({ id: expenseCategories.id });
    if (deleted.length === 0) {
      return c.json({ error: "Expense category not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});

// ─── Expenses ────────────────────────────────────────────────────────────────

app.get("/expenses", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query;
    const sourceType = q("sourceType") ?? undefined;
    const sourceId = q("sourceId") ?? undefined;
    const categoryId = q("categoryId") ?? undefined;
    const dateFrom = q("dateFrom") ?? undefined;
    const dateTo = q("dateTo") ?? undefined;
    const { page, pageSize } = parsePage((name) => c.req.query(name));
    const db = getApiDb();
    const where = and(
      sourceType
        ? eq(
            financeExpenses.sourceType,
            sourceType as (typeof expenseSourceType.enumValues)[number],
          )
        : undefined,
      sourceId ? eq(financeExpenses.sourceId, sourceId) : undefined,
      categoryId ? eq(financeExpenses.categoryId, categoryId) : undefined,
      dateFrom ? gte(financeExpenses.expenseDate, dateFrom) : undefined,
      dateTo ? lte(financeExpenses.expenseDate, dateTo) : undefined,
    );
    const [countRow] = await db
      .select({ total: count() })
      .from(financeExpenses)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(financeExpenses)
      .where(where)
      .orderBy(
        sql`${financeExpenses.expenseDate} DESC NULLS LAST`,
        desc(financeExpenses.createdAt),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({
      expenses: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch expenses");
  }
});

app.post("/expenses", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = createFinanceExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const conversion = resolveBdtConversion(
      parsed.data.currency,
      parsed.data.amount,
      parsed.data.exchangeRate,
    );
    const db = getApiDb();
    // Snapshot the category name into the legacy `category` text column.
    let category: string | undefined;
    if (parsed.data.categoryId) {
      category = await resolveCategoryName(db, parsed.data.categoryId);
    }
    const data = tableFields(financeExpenses, parsed.data, true);
    data.currency = conversion.currency;
    data.exchangeRate = conversion.exchangeRate;
    data.amountBdt = conversion.amountBdt;
    if (category !== undefined) data.category = category;
    const [row] = await db
      .insert(financeExpenses)
      .values({
        ...data,
        createdBy: user.id,
      } as typeof financeExpenses.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create" }, 500);
    return c.json(row, 201);
  } catch (err) {
    return errorResponse(c, err, "Failed to create");
  }
});

app.get("/expenses/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(financeExpenses)
      .where(eq(financeExpenses.id, c.req.param("id")))
      .limit(1);
    if (!row) return c.json({ error: "Expense not found" }, 404);
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch");
  }
});

app.put("/expenses/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = updateFinanceExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const [existing] = await db
      .select()
      .from(financeExpenses)
      .where(eq(financeExpenses.id, id))
      .limit(1);
    if (!existing) return c.json({ error: "Expense not found" }, 404);
    // Snapshot the category name when categoryId changes.
    let category: string | undefined;
    if (
      typeof parsed.data.categoryId === "string" &&
      parsed.data.categoryId
    ) {
      category = await resolveCategoryName(db, parsed.data.categoryId);
    }
    const fields = tableFields(financeExpenses, parsed.data, false);
    if (category !== undefined) fields.category = category;
    // Keep amount_bdt consistent whenever amount, currency or rate changes.
    if (
      parsed.data.amount !== undefined ||
      parsed.data.currency !== undefined ||
      parsed.data.exchangeRate !== undefined
    ) {
      const conversion = resolveBdtConversion(
        parsed.data.currency ?? existing.currency,
        parsed.data.amount ?? existing.amount,
        parsed.data.exchangeRate ?? existing.exchangeRate,
      );
      fields.currency = conversion.currency;
      fields.exchangeRate = conversion.exchangeRate;
      fields.amountBdt = conversion.amountBdt;
    }
    if (Object.keys(fields).length === 0) return c.json(existing);
    const [row] = await db
      .update(financeExpenses)
      .set(fields as typeof financeExpenses.$inferInsert)
      .where(eq(financeExpenses.id, id))
      .returning();
    if (!row) return c.json({ error: "Expense not found" }, 404);
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to update");
  }
});

app.delete("/expenses/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const deleted = await db
      .delete(financeExpenses)
      .where(eq(financeExpenses.id, c.req.param("id")))
      .returning({ id: financeExpenses.id });
    if (deleted.length === 0) {
      return c.json({ error: "Expense not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});

// ─── Invoices ────────────────────────────────────────────────────────────────

app.get("/invoices", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query;
    const statusParam = q("status") ?? undefined;
    const statuses = statusParam
      ? statusParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    const sourceType = q("sourceType") ?? undefined;
    const sourceId = q("sourceId") ?? undefined;
    const clientId = q("clientId") ?? undefined;
    const { page, pageSize } = parsePage((name) => c.req.query(name));
    const db = getApiDb();
    const where = and(
      statuses && statuses.length > 0
        ? inArray(
            financeInvoices.status,
            statuses as (typeof invoiceStatus.enumValues)[number][],
          )
        : undefined,
      sourceType
        ? eq(
            financeInvoices.sourceType,
            sourceType as (typeof paymentSourceType.enumValues)[number],
          )
        : undefined,
      sourceId ? eq(financeInvoices.sourceId, sourceId) : undefined,
      clientId ? eq(financeInvoices.clientId, clientId) : undefined,
    );
    const [countRow] = await db
      .select({ total: count() })
      .from(financeInvoices)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(financeInvoices)
      .where(where)
      .orderBy(
        sql`${financeInvoices.issuedDate} DESC NULLS LAST`,
        desc(financeInvoices.createdAt),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({
      invoices: rows.map(withParsedLineItems),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch invoices");
  }
});

app.post("/invoices", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = createFinanceInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const lineItems = normalizeLineItems(parsed.data.lineItems);
    const subtotal = round2(
      lineItems.reduce((sum, item) => sum + item.total, 0),
    );
    const discount =
      parsed.data.discount === undefined
        ? 0
        : Number(parsed.data.discount);
    const total = round2(subtotal - discount);
    const conversion = resolveBdtConversion(
      parsed.data.currency,
      total,
      parsed.data.exchangeRate,
    );
    const db = getApiDb();
    const invoiceNumber =
      typeof parsed.data.invoiceNumber === "string" &&
      parsed.data.invoiceNumber
        ? parsed.data.invoiceNumber
        : await generateInvoiceNumber(db, parsed.data.issuedDate);
    const data = tableFields(financeInvoices, parsed.data, true);
    data.invoiceNumber = invoiceNumber;
    data.lineItems = lineItems;
    data.subtotal = subtotal;
    data.discount = discount;
    data.total = total;
    data.currency = conversion.currency;
    data.exchangeRate = conversion.exchangeRate;
    data.totalBdt = conversion.amountBdt;
    const [row] = await db
      .insert(financeInvoices)
      .values({
        ...data,
        createdBy: user.id,
      } as typeof financeInvoices.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create" }, 500);
    return c.json(withParsedLineItems(row), 201);
  } catch (err) {
    return errorResponse(c, err, "Failed to create");
  }
});

app.get("/invoices/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(financeInvoices)
      .where(eq(financeInvoices.id, c.req.param("id")))
      .limit(1);
    if (!row) return c.json({ error: "Invoice not found" }, 404);
    return c.json(withParsedLineItems(row));
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch");
  }
});

app.put("/invoices/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = updateFinanceInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const [existingRow] = await db
      .select()
      .from(financeInvoices)
      .where(eq(financeInvoices.id, id))
      .limit(1);
    if (!existingRow) return c.json({ error: "Invoice not found" }, 404);
    const existing = withParsedLineItems(existingRow);
    const fields = tableFields(financeInvoices, parsed.data, false);
    let totalsChanged = false;
    if (parsed.data.lineItems !== undefined) {
      const lineItems = normalizeLineItems(parsed.data.lineItems);
      const subtotal = round2(
        lineItems.reduce((sum, item) => sum + item.total, 0),
      );
      const discount =
        parsed.data.discount === undefined
          ? Number(existing.discount ?? 0)
          : Number(parsed.data.discount ?? 0);
      fields.lineItems = lineItems;
      fields.subtotal = subtotal;
      fields.discount = discount;
      fields.total = round2(subtotal - discount);
      totalsChanged = true;
    } else if (
      parsed.data.discount !== undefined &&
      existing.subtotal !== null
    ) {
      const discount = Number(parsed.data.discount ?? 0);
      fields.total = round2(Number(existing.subtotal) - discount);
      totalsChanged = true;
    }
    // Keep total_bdt consistent whenever money fields change.
    if (
      totalsChanged ||
      parsed.data.currency !== undefined ||
      parsed.data.exchangeRate !== undefined
    ) {
      const effectiveTotal =
        fields.total !== undefined
          ? Number(fields.total)
          : Number(existing.total ?? 0);
      const conversion = resolveBdtConversion(
        parsed.data.currency ?? existing.currency,
        effectiveTotal,
        parsed.data.exchangeRate ?? existing.exchangeRate,
      );
      fields.currency = conversion.currency;
      fields.exchangeRate = conversion.exchangeRate;
      fields.totalBdt = conversion.amountBdt;
    }
    if (Object.keys(fields).length === 0) return c.json(existing);
    const [row] = await db
      .update(financeInvoices)
      .set(fields as typeof financeInvoices.$inferInsert)
      .where(eq(financeInvoices.id, id))
      .returning();
    if (!row) return c.json({ error: "Invoice not found" }, 404);
    return c.json(withParsedLineItems(row));
  } catch (err) {
    return errorResponse(c, err, "Failed to update");
  }
});

app.delete("/invoices/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const deleted = await db
      .delete(financeInvoices)
      .where(eq(financeInvoices.id, c.req.param("id")))
      .returning({ id: financeInvoices.id });
    if (deleted.length === 0) {
      return c.json({ error: "Invoice not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});

// POST (not PATCH) — matches the Next.js source exactly.
app.post("/invoices/:id/status", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = invoiceStatusSchema.safeParse(body?.status);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const [row] = await db
      .update(financeInvoices)
      .set({ status: parsed.data })
      .where(eq(financeInvoices.id, id))
      .returning();
    if (!row) return c.json({ error: "Invoice not found" }, 404);
    const invoice = withParsedLineItems(row);
    // TODO (cutover): if (parsed.data === "paid") dispatchTrigger(dbUrl,
    // "invoice_paid", invoice.id, { ...invoice, triggeredBy: user.id }) —
    // isolated so a workflow failure never fails the status change itself.
    return c.json(invoice);
  } catch (err) {
    return errorResponse(c, err, "Failed to update invoice status");
  }
});

// ─── Payment methods ─────────────────────────────────────────────────────────

app.get("/payment-methods", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const onlyActive = c.req.query("onlyActive") === "true";
    const { page, pageSize } = parsePage((name) => c.req.query(name));
    const db = getApiDb();
    const where = onlyActive ? eq(paymentMethods.isActive, true) : undefined;
    const [countRow] = await db
      .select({ total: count() })
      .from(paymentMethods)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(paymentMethods)
      .where(where)
      .orderBy(desc(paymentMethods.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({
      paymentMethods: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch payment methods");
  }
});

app.post("/payment-methods", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = createPaymentMethodSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const data = tableFields(paymentMethods, parsed.data, true);
    const [row] = await db
      .insert(paymentMethods)
      .values(data as typeof paymentMethods.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create" }, 500);
    return c.json(row, 201);
  } catch (err) {
    return errorResponse(c, err, "Failed to create");
  }
});

app.get("/payment-methods/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, c.req.param("id")))
      .limit(1);
    if (!row) {
      return c.json({ error: "Payment method not found" }, 404);
    }
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch");
  }
});

app.put("/payment-methods/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = updatePaymentMethodSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const [existing] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .limit(1);
    if (!existing) {
      return c.json({ error: "Payment method not found" }, 404);
    }
    const fields = tableFields(paymentMethods, parsed.data, false);
    if (Object.keys(fields).length === 0) return c.json(existing);
    const [row] = await db
      .update(paymentMethods)
      .set(fields as typeof paymentMethods.$inferInsert)
      .where(eq(paymentMethods.id, id))
      .returning();
    if (!row) {
      return c.json({ error: "Payment method not found" }, 404);
    }
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to update");
  }
});

app.delete("/payment-methods/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const deleted = await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, c.req.param("id")))
      .returning({ id: paymentMethods.id });
    if (deleted.length === 0) {
      return c.json({ error: "Payment method not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});

// ─── Payments ────────────────────────────────────────────────────────────────

app.get("/payments", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query;
    const sourceType = q("sourceType") ?? undefined;
    const sourceId = q("sourceId") ?? undefined;
    const clientId = q("clientId") ?? undefined;
    const invoiceId = q("invoiceId") ?? undefined;
    const paymentMethodId = q("paymentMethodId") ?? undefined;
    const dateFrom = q("dateFrom") ?? undefined;
    const dateTo = q("dateTo") ?? undefined;
    const { page, pageSize } = parsePage((name) => c.req.query(name));
    const db = getApiDb();
    const where = and(
      sourceType
        ? eq(
            financePayments.sourceType,
            sourceType as (typeof paymentSourceType.enumValues)[number],
          )
        : undefined,
      sourceId ? eq(financePayments.sourceId, sourceId) : undefined,
      clientId ? eq(financePayments.clientId, clientId) : undefined,
      invoiceId ? eq(financePayments.invoiceId, invoiceId) : undefined,
      paymentMethodId
        ? eq(financePayments.paymentMethodId, paymentMethodId)
        : undefined,
      dateFrom ? gte(financePayments.paymentDate, dateFrom) : undefined,
      dateTo ? lte(financePayments.paymentDate, dateTo) : undefined,
    );
    const [countRow] = await db
      .select({ total: count() })
      .from(financePayments)
      .where(where);
    const total = Number(countRow?.total ?? 0);
    const rows = await db
      .select()
      .from(financePayments)
      .where(where)
      .orderBy(
        sql`${financePayments.paymentDate} DESC NULLS LAST`,
        desc(financePayments.createdAt),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return c.json({
      payments: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch payments");
  }
});

app.post("/payments", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = createFinancePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const conversion = resolveBdtConversion(
      parsed.data.currency,
      parsed.data.amount,
      parsed.data.exchangeRate,
    );
    const db = getApiDb();
    const data = tableFields(financePayments, parsed.data, true);
    data.currency = conversion.currency;
    data.exchangeRate = conversion.exchangeRate;
    data.amountBdt = conversion.amountBdt;
    const [row] = await db
      .insert(financePayments)
      .values({
        ...data,
        createdBy: user.id,
      } as typeof financePayments.$inferInsert)
      .returning();
    if (!row) return c.json({ error: "Failed to create" }, 500);
    // TODO (cutover): dispatchTrigger(dbUrl, "payment_received", row.id,
    // { ...row, triggeredBy: user.id }) — isolated so a workflow failure
    // never fails the payment creation itself.
    return c.json(row, 201);
  } catch (err) {
    return errorResponse(c, err, "Failed to create");
  }
});

app.get("/payments/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(financePayments)
      .where(eq(financePayments.id, c.req.param("id")))
      .limit(1);
    if (!row) return c.json({ error: "Payment not found" }, 404);
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch");
  }
});

app.put("/payments/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = (await c.req.json()) as Record<string, unknown>;
    const parsed = updateFinancePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: invalidBody(parsed) }, 400);
    }
    const db = getApiDb();
    const [existing] = await db
      .select()
      .from(financePayments)
      .where(eq(financePayments.id, id))
      .limit(1);
    if (!existing) return c.json({ error: "Payment not found" }, 404);
    const fields = tableFields(financePayments, parsed.data, false);
    // Keep amount_bdt consistent whenever amount, currency or rate changes.
    if (
      parsed.data.amount !== undefined ||
      parsed.data.currency !== undefined ||
      parsed.data.exchangeRate !== undefined
    ) {
      const conversion = resolveBdtConversion(
        parsed.data.currency ?? existing.currency,
        parsed.data.amount ?? existing.amount,
        parsed.data.exchangeRate ?? existing.exchangeRate,
      );
      fields.currency = conversion.currency;
      fields.exchangeRate = conversion.exchangeRate;
      fields.amountBdt = conversion.amountBdt;
    }
    if (Object.keys(fields).length === 0) return c.json(existing);
    const [row] = await db
      .update(financePayments)
      .set(fields as typeof financePayments.$inferInsert)
      .where(eq(financePayments.id, id))
      .returning();
    if (!row) return c.json({ error: "Payment not found" }, 404);
    return c.json(row);
  } catch (err) {
    return errorResponse(c, err, "Failed to update");
  }
});

app.delete("/payments/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getApiDb();
    const deleted = await db
      .delete(financePayments)
      .where(eq(financePayments.id, c.req.param("id")))
      .returning({ id: financePayments.id });
    if (deleted.length === 0) {
      return c.json({ error: "Payment not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});

// ─── Summary ─────────────────────────────────────────────────────────────────

app.get("/summary", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const sourceType = c.req.query("sourceType") ?? undefined;
    const sourceId = c.req.query("sourceId") ?? undefined;
    const agreedAmountBdt = c.req.query("agreedAmountBdt") ?? undefined;
    const db = getApiDb();

    // Per-source summary (FinanceSummaryRepository.getSourceSummary).
    if (sourceType && sourceId) {
      const [paymentRow] = await db
        .select({ total: sum(financePayments.amountBdt) })
        .from(financePayments)
        .where(
          and(
            eq(
              financePayments.sourceType,
              sourceType as (typeof paymentSourceType.enumValues)[number],
            ),
            eq(financePayments.sourceId, sourceId),
          ),
        );
      const [expenseRow] = await db
        .select({ total: sum(financeExpenses.amountBdt) })
        .from(financeExpenses)
        .where(
          and(
            eq(
              financeExpenses.sourceType,
              sourceType as (typeof expenseSourceType.enumValues)[number],
            ),
            eq(financeExpenses.sourceId, sourceId),
          ),
        );
      const totalReceivedBdt = Number(paymentRow?.total ?? 0);
      const totalExpensesBdt = Number(expenseRow?.total ?? 0);
      return c.json({
        sourceType,
        sourceId,
        totalReceivedBdt,
        totalExpensesBdt,
        pendingBdt: agreedAmountBdt
          ? round2(Number(agreedAmountBdt) - totalReceivedBdt)
          : null,
        netProfitBdt: round2(totalReceivedBdt - totalExpensesBdt),
      });
    }

    // Global summary (FinanceSummaryRepository.getGlobalSummary).
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const [incomeRow] = await db
      .select({ total: sum(financePayments.amountBdt) })
      .from(financePayments);
    const [incomeMonthRow] = await db
      .select({ total: sum(financePayments.amountBdt) })
      .from(financePayments)
      .where(gte(financePayments.paymentDate, monthStart));
    const [expenseRow] = await db
      .select({ total: sum(financeExpenses.amountBdt) })
      .from(financeExpenses);
    const [expenseMonthRow] = await db
      .select({ total: sum(financeExpenses.amountBdt) })
      .from(financeExpenses)
      .where(gte(financeExpenses.expenseDate, monthStart));
    const totalIncomeBdt = Number(incomeRow?.total ?? 0);
    const currentMonthIncomeBdt = Number(incomeMonthRow?.total ?? 0);
    const totalExpensesBdt = Number(expenseRow?.total ?? 0);
    const currentMonthExpensesBdt = Number(expenseMonthRow?.total ?? 0);

    const sourceRows = await db
      .select({
        sourceType: financePayments.sourceType,
        total: sum(financePayments.amountBdt),
      })
      .from(financePayments)
      .groupBy(financePayments.sourceType)
      .orderBy(desc(sum(financePayments.amountBdt)));
    const clientRows = await db
      .select({
        clientId: financePayments.clientId,
        total: sum(financePayments.amountBdt),
      })
      .from(financePayments)
      .where(isNotNull(financePayments.clientId))
      .groupBy(financePayments.clientId)
      .orderBy(desc(sum(financePayments.amountBdt)))
      .limit(10);

    // Monthly trend, last 12 months (source uses generate_series in SQL;
    // the same 12 YYYY-MM buckets are built here and filled from ranged
    // selects, so no raw SQL is needed on the Neon HTTP driver).
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }
    const rangeStart = `${months[0]}-01`;
    const trendIncomeRows = await db
      .select({
        date: financePayments.paymentDate,
        amountBdt: financePayments.amountBdt,
      })
      .from(financePayments)
      .where(gte(financePayments.paymentDate, rangeStart));
    const trendExpenseRows = await db
      .select({
        date: financeExpenses.expenseDate,
        amountBdt: financeExpenses.amountBdt,
      })
      .from(financeExpenses)
      .where(gte(financeExpenses.expenseDate, rangeStart));
    const incomeByMonth = new Map<string, number>();
    const expensesByMonth = new Map<string, number>();
    for (const row of trendIncomeRows) {
      const month = (row.date ?? "").slice(0, 7);
      if (!months.includes(month)) continue;
      incomeByMonth.set(
        month,
        round2((incomeByMonth.get(month) ?? 0) + Number(row.amountBdt ?? 0)),
      );
    }
    for (const row of trendExpenseRows) {
      const month = (row.date ?? "").slice(0, 7);
      if (!months.includes(month)) continue;
      expensesByMonth.set(
        month,
        round2(
          (expensesByMonth.get(month) ?? 0) + Number(row.amountBdt ?? 0),
        ),
      );
    }
    const monthlyTrend = months.map((month) => ({
      month,
      incomeBdt: incomeByMonth.get(month) ?? 0,
      expensesBdt: expensesByMonth.get(month) ?? 0,
    }));

    return c.json({
      totalIncomeBdt,
      currentMonthIncomeBdt,
      totalExpensesBdt,
      currentMonthExpensesBdt,
      netProfitBdt: round2(totalIncomeBdt - totalExpensesBdt),
      incomeBySourceType: sourceRows.map((row) => ({
        sourceType: row.sourceType,
        totalBdt: Number(row.total ?? 0),
      })),
      topClients: clientRows.map((row) => ({
        clientId: row.clientId as string,
        totalBdt: Number(row.total ?? 0),
      })),
      monthlyTrend,
    });
  } catch (err) {
    return errorResponse(c, err, "Failed to fetch finance summary");
  }
});

export default app;
