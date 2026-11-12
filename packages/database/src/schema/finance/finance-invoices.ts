import { pgTable, uuid, varchar, numeric, jsonb, timestamp, date, text } from "drizzle-orm/pg-core";
import { paymentSourceType, invoiceStatus } from "../enums";

export const financeInvoices = pgTable("finance_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).unique(),
  sourceType: paymentSourceType("source_type"),
  sourceId: uuid("source_id"),
  clientId: uuid("client_id"),
  lineItems: jsonb("line_items"),
  subtotal: numeric("subtotal"),
  discount: numeric("discount"),
  total: numeric("total"),
  totalBdt: numeric("total_bdt"),
  currency: varchar("currency", { length: 10 }),
  exchangeRate: numeric("exchange_rate"),
  status: invoiceStatus("status"),
  issuedDate: date("issued_date"),
  dueDate: date("due_date"),
  notes: text("notes"),
  pdfUrl: text("pdf_url"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
