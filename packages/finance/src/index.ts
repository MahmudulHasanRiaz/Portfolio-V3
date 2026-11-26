import postgres from "postgres";
import { PaymentMethodRepository } from "./payment-method-repository";
import { ExpenseCategoryRepository } from "./expense-category-repository";
import { FinancePaymentRepository } from "./payment-repository";
import { FinanceExpenseRepository } from "./expense-repository";
import { FinanceInvoiceRepository } from "./invoice-repository";
import { FinanceSummaryRepository } from "./summary-repository";


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
