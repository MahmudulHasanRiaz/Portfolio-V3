import postgres from "postgres";
import { PaymentMethodRepository } from "./payment-method-repository";
import { ExpenseCategoryRepository } from "./expense-category-repository";
import { FinancePaymentRepository } from "./payment-repository";
import { FinanceExpenseRepository } from "./expense-repository";
import { FinanceInvoiceRepository } from "./invoice-repository";
import { FinanceSummaryRepository } from "./summary-repository";

export { PaymentMethodRepository } from "./payment-method-repository";
export { ExpenseCategoryRepository, slugifyCategoryName } from "./expense-category-repository";
export { FinancePaymentRepository } from "./payment-repository";
export { FinanceExpenseRepository } from "./expense-repository";
export { FinanceInvoiceRepository, normalizeLineItems } from "./invoice-repository";
export { FinanceSummaryRepository } from "./summary-repository";
export { resolveBdtConversion, round2 } from "./currency";
export type { BdtConversion } from "./currency";
export {
  FinanceError,
  PaymentMethodNotFoundError,
  ExpenseCategoryNotFoundError,
  InvoiceNotFoundError,
  PaymentNotFoundError,
  ExpenseNotFoundError,
} from "./errors";
export type {
  PaymentMethodFilters,
  PaymentMethodRow,
  PaymentMethodListResponse,
  ExpenseCategoryFilters,
  ExpenseCategoryRow,
  ExpenseCategoryListResponse,
  FinancePaymentFilters,
  FinancePaymentRow,
  FinancePaymentListResponse,
  FinanceExpenseFilters,
  FinanceExpenseRow,
  FinanceExpenseListResponse,
  InvoiceLineItem,
  FinanceInvoiceFilters,
  FinanceInvoiceRow,
  FinanceInvoiceListResponse,
  CategoryExpenseTotal,
  SourceFinanceSummary,
  MonthlyTrendPoint,
  GlobalFinanceSummary,
} from "./types";

export function createFinanceRepositories(connectionString: string) {
  const sql = postgres(connectionString, { max: 10 });
  return {
    paymentMethods: new PaymentMethodRepository(sql),
    expenseCategories: new ExpenseCategoryRepository(sql),
    payments: new FinancePaymentRepository(sql),
    expenses: new FinanceExpenseRepository(sql),
    invoices: new FinanceInvoiceRepository(sql),
    summary: new FinanceSummaryRepository(sql),
    close: () => sql.end(),
  };
}
