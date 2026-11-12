import { pgTable, uuid, text, varchar, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { paymentSourceType, paymentType } from "../enums";

export const financePayments = pgTable("finance_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceType: paymentSourceType("source_type"),
  sourceId: uuid("source_id"),
  clientId: uuid("client_id"),
  amount: numeric("amount"),
  currency: varchar("currency", { length: 10 }),
  exchangeRate: numeric("exchange_rate"),
  amountBdt: numeric("amount_bdt"),
  paymentMethodId: uuid("payment_method_id"),
  paymentDate: date("payment_date"),
  paymentType: paymentType("payment_type"),
  notes: text("notes"),
  invoiceId: uuid("invoice_id"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
