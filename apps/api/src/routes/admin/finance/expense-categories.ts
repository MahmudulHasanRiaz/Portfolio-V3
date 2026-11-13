// Expense categories admin routes — split from routes/admin/finance.ts
// (moved verbatim, behavior unchanged). Mounted at /finance by the
// coordinator via finance/index.ts.
import { Hono } from "hono";
import { asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { expenseCategories } from "@repo/database/schema";
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

function slugifyCategoryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}


const slugSchema = z.string().min(1).max(255).regex(/^[a-z0-9-]+$/);


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
const updateExpenseCategorySchema = expenseCategorySchema
  .omit({ id: true, createdAt: true })
  .partial();


// ─── Expense categories ──────────────────────────────────────────────────────

const CATEGORY_DUPLICATE_MESSAGE =
  "A category with this slug already exists. Choose a different slug.";


app.get("/expense-categories", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const onlyActive = c.req.query("onlyActive") === "true";
    const { page, pageSize } = parsePagination(c);
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
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const [row] = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.id, id))
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const body = await readJsonBody(c);
    if (!isRecord(body)) {
      return c.json({ error: "Invalid request body" }, 400);
    }
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
    const id = uuidParam(c, "id");
    if (!id) return invalidParam(c, "id");
    const db = getApiDb();
    const deleted = await db
      .delete(expenseCategories)
      .where(eq(expenseCategories.id, id))
      .returning({ id: expenseCategories.id });
    if (deleted.length === 0) {
      return c.json({ error: "Expense category not found" }, 404);
    }
    return c.json({ success: true });
  } catch (err) {
    return errorResponse(c, err, "Failed to delete");
  }
});


export default app;
