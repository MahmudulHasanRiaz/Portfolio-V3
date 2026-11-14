// Payment methods admin routes — split from routes/admin/finance.ts
// (moved verbatim, behavior unchanged). Mounted at /finance by the
// coordinator via finance/index.ts.
import { Hono } from "hono";
import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { paymentMethods } from "@repo/database/schema";
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
  errorResponse,
  invalidBody,
  tableFields,
  timestampSchema,
  uuidSchema,
} from "./helpers";

const app = new Hono<Env>();

const paymentMethodTypeSchema = z.enum([
  "mobile_banking",
  "bank",
  "cash",
  "international",
]);


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
const updatePaymentMethodSchema = paymentMethodSchema
  .omit({ id: true, createdAt: true })
  .partial();


// ─── Payment methods ─────────────────────────────────────────────────────────

app.get("/payment-methods", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const onlyActive = c.req.query("onlyActive") === "true";
    const { page, pageSize } = parsePagination(c);
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, id))
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const deleted = await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .returning({ id: paymentMethods.id });
    if (deleted.length === 0) {
      return c.json({ error: "Payment method not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});


export default app;
