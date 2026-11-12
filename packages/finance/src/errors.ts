export class FinanceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "FinanceError";
  }
}

export class PaymentMethodNotFoundError extends FinanceError {
  constructor(id: string) {
    super(`Payment method not found: ${id}`, "PAYMENT_METHOD_NOT_FOUND");
  }
}

export class ExpenseCategoryNotFoundError extends FinanceError {
  constructor(id: string) {
    super(`Expense category not found: ${id}`, "EXPENSE_CATEGORY_NOT_FOUND");
  }
}

export class InvoiceNotFoundError extends FinanceError {
  constructor(id: string) {
    super(`Invoice not found: ${id}`, "INVOICE_NOT_FOUND");
  }
}

export class PaymentNotFoundError extends FinanceError {
  constructor(id: string) {
    super(`Payment not found: ${id}`, "PAYMENT_NOT_FOUND");
  }
}

export class ExpenseNotFoundError extends FinanceError {
  constructor(id: string) {
    super(`Expense not found: ${id}`, "EXPENSE_NOT_FOUND");
  }
}
