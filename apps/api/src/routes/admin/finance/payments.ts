// Payments admin routes — split from routes/admin/finance.ts
// (moved verbatim, behavior unchanged). Mounted at /finance by the
// coordinator via finance/index.ts.
import { Hono } from "hono";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { financePayments, paymentSourceType } from "@repo/database/schema";
import { getApiDb } from "../../../db";
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
  dispatchWorkflowTrigger,
  errorResponse,
  invalidBody,
  isValidDateString,
  paymentSourceTypeSchema,
  resolveBdtConversion,
  tableFields,
  timestampSchema,
  uuidSchema,
} from "./helpers";

const app = new Hono<Env>();

const paymentTypeSchema = z.enum([
  "advance",
  "installment",
  "final",
  "full",
]);


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
const updateFinancePaymentSchema = financePaymentSchema
  // amountBdt is server-computed, never client-supplied (see the create
  // schema comment). Omit it (and identity fields) so a PUT that changes
  // only description/notes cannot smuggle a client-supplied amountBdt
  // past the recompute — the old .partial() accepted and wrote it verbatim.
  .omit({ id: true, amountBdt: true, createdBy: true, createdAt: true })
  .partial();


// ─── Payments ────────────────────────────────────────────────────────────────

app.get("/payments", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const q = c.req.query.bind(c.req); // NB: query() reads this.url, so it must stay bound to c.req.
    const sourceType = q("sourceType") ?? undefined;
    const sourceId = q("sourceId") ?? undefined;
    const clientId = q("clientId") ?? undefined;
    const invoiceId = q("invoiceId") ?? undefined;
    const paymentMethodId = q("paymentMethodId") ?? undefined;
    const dateFrom = q("dateFrom") ?? undefined;
    const dateTo = q("dateTo") ?? undefined;
    if (
      sourceType !== undefined &&
      !paymentSourceTypeSchema.safeParse(sourceType).success
    ) {
      return c.json({ error: "Invalid sourceType" }, 400);
    }
    for (const [name, value] of [
      ["sourceId", sourceId],
      ["clientId", clientId],
      ["invoiceId", invoiceId],
      ["paymentMethodId", paymentMethodId],
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
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
    // Workflow dispatch is isolated: a workflow failure must never fail
    // the payment creation itself.
    try {
      await dispatchWorkflowTrigger(db, "payment_received", row.id, {
        ...row,
        triggeredBy: user.id,
      });
    } catch (err) {
      console.error(
        "[Payments API] Failed to dispatch payment_received:",
        err,
      );
    }
    return c.json(row, 201);
  } catch (err) {
    return errorResponse(c, err, "Failed to create");
  }
});

app.get("/payments/:id", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(financePayments)
      .where(eq(financePayments.id, id))
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const deleted = await db
      .delete(financePayments)
      .where(eq(financePayments.id, id))
      .returning({ id: financePayments.id });
    if (deleted.length === 0) {
      return c.json({ error: "Payment not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});


export default app;
