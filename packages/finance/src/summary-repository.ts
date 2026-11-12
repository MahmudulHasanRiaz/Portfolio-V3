import postgres from "postgres";
import type { SourceFinanceSummary, GlobalFinanceSummary, MonthlyTrendPoint } from "./types";
import { round2 } from "./currency";

type Sql = postgres.Sql<{}>;

export class FinanceSummaryRepository {
  constructor(private sql: Sql) {}

  async getSourceSummary(
    sourceType: string,
    sourceId: string,
    agreedAmountBdt?: number
  ): Promise<SourceFinanceSummary> {
    const paymentRows = await this.sql.unsafe<{ total: string }[]>(
      "SELECT COALESCE(SUM(amount_bdt), 0) as total FROM finance_payments WHERE source_type = $1 AND source_id = $2::uuid",
      [sourceType, sourceId]
    );
    const expenseRows = await this.sql.unsafe<{ total: string }[]>(
      "SELECT COALESCE(SUM(amount_bdt), 0) as total FROM finance_expenses WHERE source_type = $1 AND source_id = $2::uuid",
      [sourceType, sourceId]
    );

    const totalReceivedBdt = Number(paymentRows[0]?.total ?? 0);
    const totalExpensesBdt = Number(expenseRows[0]?.total ?? 0);

    return {
      sourceType,
      sourceId,
      totalReceivedBdt,
      totalExpensesBdt,
      pendingBdt:
        agreedAmountBdt === undefined ? null : round2(agreedAmountBdt - totalReceivedBdt),
      netProfitBdt: round2(totalReceivedBdt - totalExpensesBdt),
    };
  }

  async getGlobalSummary(): Promise<GlobalFinanceSummary> {
    const incomeRows = await this.sql.unsafe<{ total: string; month_total: string }[]>(
      `SELECT
         COALESCE(SUM(amount_bdt), 0) as total,
         COALESCE(SUM(amount_bdt) FILTER (WHERE payment_date >= date_trunc('month', CURRENT_DATE)::date), 0) as month_total
       FROM finance_payments`
    );
    const expenseRows = await this.sql.unsafe<{ total: string; month_total: string }[]>(
      `SELECT
         COALESCE(SUM(amount_bdt), 0) as total,
         COALESCE(SUM(amount_bdt) FILTER (WHERE expense_date >= date_trunc('month', CURRENT_DATE)::date), 0) as month_total
       FROM finance_expenses`
    );

    const totalIncomeBdt = Number(incomeRows[0]?.total ?? 0);
    const currentMonthIncomeBdt = Number(incomeRows[0]?.month_total ?? 0);
    const totalExpensesBdt = Number(expenseRows[0]?.total ?? 0);
    const currentMonthExpensesBdt = Number(expenseRows[0]?.month_total ?? 0);

    const sourceRows = await this.sql.unsafe<{ source_type: string | null; total: string }[]>(
      "SELECT source_type, COALESCE(SUM(amount_bdt), 0) as total FROM finance_payments GROUP BY source_type ORDER BY total DESC"
    );

    const clientRows = await this.sql.unsafe<{ client_id: string; total: string }[]>(
      "SELECT client_id, COALESCE(SUM(amount_bdt), 0) as total FROM finance_payments WHERE client_id IS NOT NULL GROUP BY client_id ORDER BY total DESC LIMIT 10"
    );

    const trendRows = await this.sql.unsafe<
      { month: string; income_bdt: string; expenses_bdt: string }[]
    >(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
           date_trunc('month', CURRENT_DATE),
           INTERVAL '1 month'
         ) AS month_start
       ),
       income AS (
         SELECT date_trunc('month', payment_date) AS m, SUM(amount_bdt) AS total
         FROM finance_payments
         WHERE payment_date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '11 months')::date
         GROUP BY 1
       ),
       expenses AS (
         SELECT date_trunc('month', expense_date) AS m, SUM(amount_bdt) AS total
         FROM finance_expenses
         WHERE expense_date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '11 months')::date
         GROUP BY 1
       )
       SELECT
         to_char(months.month_start, 'YYYY-MM') AS month,
         COALESCE(income.total, 0) AS income_bdt,
         COALESCE(expenses.total, 0) AS expenses_bdt
       FROM months
       LEFT JOIN income ON income.m = months.month_start
       LEFT JOIN expenses ON expenses.m = months.month_start
       ORDER BY months.month_start ASC`
    );

    const monthlyTrend: MonthlyTrendPoint[] = trendRows.map((row) => ({
      month: row.month,
      incomeBdt: Number(row.income_bdt ?? 0),
      expensesBdt: Number(row.expenses_bdt ?? 0),
    }));

    return {
      totalIncomeBdt,
      currentMonthIncomeBdt,
      totalExpensesBdt,
      currentMonthExpensesBdt,
      netProfitBdt: round2(totalIncomeBdt - totalExpensesBdt),
      incomeBySourceType: sourceRows.map((row) => ({
        sourceType: row.source_type,
        totalBdt: Number(row.total ?? 0),
      })),
      topClients: clientRows.map((row) => ({
        clientId: row.client_id,
        totalBdt: Number(row.total ?? 0),
      })),
      monthlyTrend,
    };
  }
}
