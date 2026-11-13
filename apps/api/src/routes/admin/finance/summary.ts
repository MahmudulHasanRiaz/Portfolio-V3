// Finance summary admin route — split from routes/admin/finance.ts
// (moved verbatim, behavior unchanged). Mounted at /finance by the
// coordinator via finance/index.ts.
import { Hono } from "hono";
import { and, desc, eq, gte, isNotNull, sum } from "drizzle-orm";
import {
  expenseSourceType,
  financeExpenses,
  financePayments,
  paymentSourceType,
} from "@repo/database/schema";
import { getApiDb } from "../../../db";
import { requireAuth } from "../../../lib/admin-auth";
import { queryParam } from "../../../lib/validate";
import {
  type Env,
  errorResponse,
  expenseSourceTypeSchema,
  paymentSourceTypeSchema,
  round2,
  uuidSchema,
} from "./helpers";

const app = new Hono<Env>();

/** True when the value is a finite number (query amount validation). */
function isFiniteNumberString(value: string): boolean {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n);
}


// ─── Summary ─────────────────────────────────────────────────────────────────

app.get("/summary", async (c) => {
  try {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const sourceType = queryParam(c, "sourceType");
    const sourceId = queryParam(c, "sourceId");
    const agreedAmountBdt = queryParam(c, "agreedAmountBdt");
    // sourceType is used against both the payments enum
    // (freelance_project|artist_event) and the expenses enum (which
    // adds general), so either enum accepts it.
    if (
      sourceType !== undefined &&
      !paymentSourceTypeSchema.safeParse(sourceType).success &&
      !expenseSourceTypeSchema.safeParse(sourceType).success
    ) {
      return c.json({ error: "Invalid sourceType" }, 400);
    }
    if (sourceId !== undefined && !uuidSchema.safeParse(sourceId).success) {
      return c.json({ error: "Invalid sourceId" }, 400);
    }
    if (
      agreedAmountBdt !== undefined &&
      !isFiniteNumberString(agreedAmountBdt)
    ) {
      return c.json({ error: "Invalid agreedAmountBdt" }, 400);
    }
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
