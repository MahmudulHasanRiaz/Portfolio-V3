import { pgTable, uuid, text, varchar, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { expenseSourceType } from "../enums";

export const financeExpenses = pgTable("finance_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceType: expenseSourceType("source_type"),
  sourceId: uuid("source_id"),
  category: text("category"),
  categoryId: uuid("category_id"),
  description: text("description"),
  amount: numeric("amount"),
  currency: varchar("currency", { length: 10 }),
  exchangeRate: numeric("exchange_rate"),
  amountBdt: numeric("amount_bdt"),
  paymentMethodId: uuid("payment_method_id"),
  expenseDate: date("expense_date"),
  receiptUrl: text("receipt_url"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
