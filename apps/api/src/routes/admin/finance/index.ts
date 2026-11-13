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
// PDF: GET /invoices/:id/pdf (+ POST alias, see below) — pdf-lib port of
// apps/dashboard/src/app/api/finance/invoices/[id]/pdf/route.ts via
// apps/dashboard/src/lib/pdf.ts generateInvoicePdf + storePdf. pdfkit
// (Node-only) is NOT used; pdf-lib is pure JS and Workers-safe. The
// generated PDF is stored in R2 under documents/ (direct PutObject,
// where the source uploaded via a presigned PUT URL — same object, same
// public URL) and the row's pdfUrl is updated, exactly as the source.
// GET returns the PDF bytes as an attachment (the Hono download form);
// POST returns { pdfUrl }, the shape the admin UI expects (it POSTs and
// window.open()s the returned URL).
//
// Workflow triggers: POST /invoices/:id/status dispatches
// "invoice_paid" when the status becomes "paid", and POST /payments
// dispatches "payment_received" after a payment is created — both
// isolated in try/catch so a workflow failure never fails the API call,
// exactly as the sources. The dispatch itself only records pending
// workflow_runs rows (the TriggerRegistry.dispatch equivalent,
// re-implemented here with direct Drizzle because
// routes/admin/workflows/index.ts does not re-export dispatchTrigger and
// @repo/workflows is postgres.js-bound); execution happens via
// /workflows/process or the cron tick. Finance routes never purge the
// public cache and never touch the search index in the sources, so there
// is nothing else to wire.

import { Hono } from "hono";
import type { Env } from "./helpers";
import expenseCategoriesRoutes from "./expense-categories";
import expensesRoutes from "./expenses";
import invoicesRoutes from "./invoices";
import paymentMethodsRoutes from "./payment-methods";
import paymentsRoutes from "./payments";
import summaryRoutes from "./summary";

const app = new Hono<Env>();

// Each sub-router defines its routes with their FULL original paths,
// so the mounted URLs are identical to the old routes/admin/finance.ts.
app.route("/", expenseCategoriesRoutes);
app.route("/", expensesRoutes);
app.route("/", invoicesRoutes);
app.route("/", paymentMethodsRoutes);
app.route("/", paymentsRoutes);
app.route("/", summaryRoutes);

export default app;
