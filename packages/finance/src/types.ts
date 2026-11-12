// Row types mirror the Drizzle schemas in
// packages/database/src/schema/finance/*.ts column-for-column (camelCase).
// Numeric columns are typed `string` because postgres.js returns
// PostgreSQL `numeric` values as strings (same convention as @repo/crm).

export interface PaymentMethodFilters {
  onlyActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PaymentMethodListResponse {
  paymentMethods: PaymentMethodRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaymentMethodRow {
  id: string;
  name: string | null;
  type: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

export interface ExpenseCategoryFilters {
  onlyActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ExpenseCategoryListResponse {
  expenseCategories: ExpenseCategoryRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ExpenseCategoryRow {
  id: string;
  name: string | null;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

export interface FinancePaymentFilters {
  sourceType?: string;
  sourceId?: string;
  clientId?: string;
  invoiceId?: string;
  paymentMethodId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface FinancePaymentListResponse {
  payments: FinancePaymentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FinancePaymentRow {
  id: string;
  sourceType: string | null;
  sourceId: string | null;
  clientId: string | null;
  amount: string | null;
  currency: string | null;
  exchangeRate: string | null;
  amountBdt: string | null;
  paymentMethodId: string | null;
  paymentDate: string | null;
  paymentType: string | null;
  notes: string | null;
  invoiceId: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface FinanceExpenseFilters {
  sourceType?: string;
  sourceId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceExpenseListResponse {
  expenses: FinanceExpenseRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FinanceExpenseRow {
  id: string;
  sourceType: string | null;
  sourceId: string | null;
  category: string | null;
  categoryId: string | null;
  description: string | null;
  amount: string | null;
  currency: string | null;
  exchangeRate: string | null;
  amountBdt: string | null;
  paymentMethodId: string | null;
  expenseDate: string | null;
  receiptUrl: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface FinanceInvoiceFilters {
  status?: string | string[];
  sourceType?: string;
  sourceId?: string;
  clientId?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceInvoiceListResponse {
  invoices: FinanceInvoiceRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FinanceInvoiceRow {
  id: string;
  invoiceNumber: string | null;
  sourceType: string | null;
  sourceId: string | null;
  clientId: string | null;
  lineItems: InvoiceLineItem[] | null;
  subtotal: string | null;
  discount: string | null;
  total: string | null;
  totalBdt: string | null;
  currency: string | null;
  exchangeRate: string | null;
  status: string | null;
  issuedDate: string | null;
  dueDate: string | null;
  notes: string | null;
  pdfUrl: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface CategoryExpenseTotal {
  categoryId: string | null;
  category: string | null;
  totalBdt: number;
  count: number;
}

export interface SourceFinanceSummary {
  sourceType: string;
  sourceId: string;
  totalReceivedBdt: number;
  totalExpensesBdt: number;
  pendingBdt: number | null;
  netProfitBdt: number;
}

export interface MonthlyTrendPoint {
  month: string;
  incomeBdt: number;
  expensesBdt: number;
}

export interface GlobalFinanceSummary {
  totalIncomeBdt: number;
  currentMonthIncomeBdt: number;
  totalExpensesBdt: number;
  currentMonthExpensesBdt: number;
  netProfitBdt: number;
  incomeBySourceType: { sourceType: string | null; totalBdt: number }[];
  topClients: { clientId: string; totalBdt: number }[];
  monthlyTrend: MonthlyTrendPoint[];
}
