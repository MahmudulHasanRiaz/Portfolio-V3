// Expenses admin routes — split from routes/admin/finance.ts
// (moved verbatim, behavior unchanged). Mounted at /finance by the
// coordinator via finance/index.ts.
import { Hono } from "hono";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  expenseCategories,
  expenseSourceType,
  financeExpenses,
} from "@repo/database/schema";
import { getApiDb, type ApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import {
  invalidParam,
  isRecord,
  parsePagination,
  readJsonBody,
  uuidParam,
} from "../../../lib/validate";
import {
  type Env,
  errorResponse,
  expenseSourceTypeSchema,
  fail,
  invalidBody,
  isValidDateString,
  resolveBdtConversion,
  tableFields,
  timestampSchema,
  uuidSchema,
} from "./helpers";

const app = new Hono<Env>();

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
const updateFinanceExpenseSchema = financeExpenseSchema
  // amountBdt is server-computed, never client-supplied (see the create
  // schema comment). Omit it (and identity fields) so a PUT that changes
  // only description/notes cannot smuggle a client-supplied amountBdt
  // past the recompute — the old .partial() accepted and wrote it verbatim.
  .omit({ id: true, amountBdt: true, createdBy: true, createdAt: true })
  .partial();


// ─── Expenses ────────────────────────────────────────────────────────────────

app.get("/expenses", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query.bind(c.req); // NB: query() reads this.url, so it must stay bound to c.req.
    const sourceType = q("sourceType") ?? undefined;
    const sourceId = q("sourceId") ?? undefined;
    const categoryId = q("categoryId") ?? undefined;
    const dateFrom = q("dateFrom") ?? undefined;
    const dateTo = q("dateTo") ?? undefined;
    if (
      sourceType !== undefined &&
      !expenseSourceTypeSchema.safeParse(sourceType).success
    ) {
      return c.json({ error: "Invalid sourceType" }, 400);
    }
    for (const [name, value] of [
      ["sourceId", sourceId],
      ["categoryId", categoryId],
    ] as const) {
      if (value !== undefined && !uuidSchema.safeParse(value).success) {
        return c.json({ error: `Invalid ${name}` }, 400);
      }
    }
    if (dateFrom !== undefined && !isValidDateString(dateFrom)) {
      return c.json({ error: "Invalid dateFrom" }, 400);
    }
    if (dateTo !== undefined && !isValidDateString(dateTo)) {
      return c.json({ error: "Invalid dateTo" }, 400);
    }
    const { page, pageSize } = parsePagination(c);
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(financeExpenses)
      .where(eq(financeExpenses.id, id))
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const deleted = await db
      .delete(financeExpenses)
      .where(eq(financeExpenses.id, id))
      .returning({ id: financeExpenses.id });
    if (deleted.length === 0) {
      return c.json({ error: "Expense not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});


export default app;
