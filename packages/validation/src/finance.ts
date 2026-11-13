import { z } from "zod";
import { uuidSchema, slugSchema, timestampSchema } from "./common";

// ─── Payment Methods ─────────────────────────────────────────────────────────

export const paymentMethodSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(100),
  type: z.enum(["mobile_banking", "bank", "cash", "international"]),
  isActive: z.boolean(),
  createdAt: timestampSchema,
});

export const createPaymentMethodSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["mobile_banking", "bank", "cash", "international"]),
  isActive: z.boolean(),
});

export const updatePaymentMethodSchema = paymentMethodSchema.partial();

// ─── Expense Categories ──────────────────────────────────────────────────────

export const expenseCategorySchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(100),
  slug: slugSchema,
  description: z.string().optional(),
  color: z.string().max(7).optional(),
  icon: z.string().optional(),
  isActive: z.boolean(),
  createdAt: timestampSchema,
});

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  color: z.string().max(7).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateExpenseCategorySchema = expenseCategorySchema.partial();

// ─── Finance Payments ────────────────────────────────────────────────────────

export const financePaymentSchema = z.object({
  id: uuidSchema,
  sourceType: z.enum(["freelance_project", "artist_event"]),
  sourceId: uuidSchema,
  clientId: uuidSchema,
  amount: z.coerce.number().min(0),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  amountBdt: z.coerce.number().optional(),
  paymentMethodId: uuidSchema,
  paymentDate: z.string(),
  paymentType: z.enum(["advance", "installment", "final", "full"]),
  notes: z.string().optional(),
  invoiceId: uuidSchema.optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});

export const createFinancePaymentSchema = z.object({
  sourceType: z.enum(["freelance_project", "artist_event"]),
  sourceId: uuidSchema,
  clientId: uuidSchema,
  amount: z.coerce.number().min(0),
  currency: z.string().max(10),
  // Required by the repository when currency is not BDT (base currency);
  // amountBdt is always computed by the repository, never sent by clients.
  exchangeRate: z.coerce.number().optional(),
  paymentMethodId: uuidSchema,
  paymentDate: z.string(),
  paymentType: z.enum(["advance", "installment", "final", "full"]),
  notes: z.string().optional(),
  invoiceId: uuidSchema.optional(),
  createdBy: uuidSchema,
});

export const updateFinancePaymentSchema = financePaymentSchema.omit({ amountBdt: true }).partial();

// ─── Finance Expenses ────────────────────────────────────────────────────────

export const financeExpenseSchema = z.object({
  id: uuidSchema,
  sourceType: z.enum(["freelance_project", "artist_event", "general"]),
  sourceId: uuidSchema.optional(),
  category: z.string().optional(),
  categoryId: uuidSchema.optional(),
  description: z.string(),
  amount: z.coerce.number().min(0),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  amountBdt: z.coerce.number().optional(),
  paymentMethodId: uuidSchema,
  expenseDate: z.string(),
  receiptUrl: z.string().optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});

export const createFinanceExpenseSchema = z.object({
  sourceType: z.enum(["freelance_project", "artist_event", "general"]),
  sourceId: uuidSchema.optional(),
  // Optional: when categoryId is given the repository snapshots the
  // category name into `category`; amountBdt is computed by the repository.
  category: z.string().optional(),
  categoryId: uuidSchema.optional(),
  description: z.string(),
  amount: z.coerce.number().min(0),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  paymentMethodId: uuidSchema,
  expenseDate: z.string(),
  receiptUrl: z.string().optional(),
  createdBy: uuidSchema,
});

export const updateFinanceExpenseSchema = financeExpenseSchema.omit({ amountBdt: true }).partial();

// ─── Finance Invoices ────────────────────────────────────────────────────────

export const financeInvoiceSchema = z.object({
  id: uuidSchema,
  invoiceNumber: z.string().max(50),
  sourceType: z.enum(["freelance_project", "artist_event"]),
  sourceId: uuidSchema,
  clientId: uuidSchema,
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.coerce.number().min(0),
    unitPrice: z.coerce.number().min(0),
    total: z.coerce.number().min(0),
  })),
  subtotal: z.coerce.number().min(0),
  discount: z.coerce.number().optional(),
  total: z.coerce.number().min(0),
  totalBdt: z.coerce.number().min(0).optional(),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  status: z.enum(["draft", "sent", "paid", "cancelled"]),
  issuedDate: z.string(),
  dueDate: z.string(),
  notes: z.string().optional(),
  pdfUrl: z.string().optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});

export const invoiceLineItemSchema = z.object({
  description: z.string(),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  // Computed by the repository from quantity * unitPrice when creating.
  total: z.coerce.number().min(0).optional(),
});

export const createFinanceInvoiceSchema = z.object({
  // invoiceNumber is auto-generated by the repository (INV-DDMMYY-serial)
  // when not provided; subtotal/total/totalBdt are always computed there.
  invoiceNumber: z.string().max(50).optional(),
  sourceType: z.enum(["freelance_project", "artist_event"]),
  sourceId: uuidSchema,
  clientId: uuidSchema,
  lineItems: z.array(invoiceLineItemSchema),
  discount: z.coerce.number().optional(),
  currency: z.string().max(10),
  exchangeRate: z.coerce.number().optional(),
  status: z.enum(["draft", "sent", "paid", "cancelled"]).optional(),
  issuedDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  pdfUrl: z.string().optional(),
  createdBy: uuidSchema,
});

export const updateFinanceInvoiceSchema = financeInvoiceSchema.omit({ subtotal: true, total: true, totalBdt: true }).partial();
