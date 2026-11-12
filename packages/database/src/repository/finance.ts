import { BaseRepository } from "./base";
import { DatabaseError } from "../errors";
import { trackQuery } from "../utils/query-timing";
import * as schema from "../schema";
import { eq, and, gte, lte } from "drizzle-orm";

export class PaymentMethodsRepository extends BaseRepository<typeof schema.paymentMethods> {
  constructor() {
    super(schema.paymentMethods, "paymentMethod");
  }

  async findActive() {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.paymentMethods as any).isActive, true) as any);
      trackQuery(this.entityName, "findActive", Date.now() - start);
      return results as typeof schema.paymentMethods.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findActive", Date.now() - start);
      throw new DatabaseError("Failed to find active payment methods", { entity: this.entityName, operation: "findActive", cause: error });
    }
  }
}

export class PaymentsRepository extends BaseRepository<typeof schema.financePayments> {
  constructor() {
    super(schema.financePayments, "payment");
  }

  async findBySource(sourceType: string, sourceId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.financePayments as any).sourceType, sourceType) as any, eq((schema.financePayments as any).sourceId, sourceId) as any) as any);
      trackQuery(this.entityName, "findBySource", Date.now() - start);
      return results as typeof schema.financePayments.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findBySource", Date.now() - start);
      throw new DatabaseError("Failed to find payments by source", { entity: this.entityName, operation: "findBySource", cause: error });
    }
  }

  async findByClient(clientId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.financePayments as any).clientId, clientId) as any);
      trackQuery(this.entityName, "findByClient", Date.now() - start);
      return results as typeof schema.financePayments.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByClient", Date.now() - start);
      throw new DatabaseError("Failed to find payments by client", { entity: this.entityName, operation: "findByClient", cause: error });
    }
  }
}

export class ExpensesRepository extends BaseRepository<typeof schema.financeExpenses> {
  constructor() {
    super(schema.financeExpenses, "expense");
  }

  async findBySource(sourceType: string, sourceId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(eq((schema.financeExpenses as any).sourceType, sourceType) as any, eq((schema.financeExpenses as any).sourceId, sourceId) as any) as any);
      trackQuery(this.entityName, "findBySource", Date.now() - start);
      return results as typeof schema.financeExpenses.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findBySource", Date.now() - start);
      throw new DatabaseError("Failed to find expenses by source", { entity: this.entityName, operation: "findBySource", cause: error });
    }
  }

  async findByDateRange(startDate: Date, endDate: Date) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(and(gte((schema.financeExpenses as any).expenseDate, startDate) as any, lte((schema.financeExpenses as any).expenseDate, endDate) as any) as any);
      trackQuery(this.entityName, "findByDateRange", Date.now() - start);
      return results as typeof schema.financeExpenses.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByDateRange", Date.now() - start);
      throw new DatabaseError("Failed to find expenses by date range", { entity: this.entityName, operation: "findByDateRange", cause: error });
    }
  }
}

export class InvoicesRepository extends BaseRepository<typeof schema.financeInvoices> {
  constructor() {
    super(schema.financeInvoices, "invoice");
  }

  async findByNumber(invoiceNumber: string) {
    const start = Date.now();
    try {
      const [result] = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.financeInvoices as any).invoiceNumber, invoiceNumber) as any)
        .limit(1);
      trackQuery(this.entityName, "findByNumber", Date.now() - start);
      return (result as typeof schema.financeInvoices.$inferSelect) || null;
    } catch (error) {
      trackQuery(this.entityName, "findByNumber", Date.now() - start);
      throw new DatabaseError("Failed to find invoice by number", { entity: this.entityName, operation: "findByNumber", cause: error });
    }
  }

  async findByClient(clientId: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.financeInvoices as any).clientId, clientId) as any);
      trackQuery(this.entityName, "findByClient", Date.now() - start);
      return results as typeof schema.financeInvoices.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByClient", Date.now() - start);
      throw new DatabaseError("Failed to find invoices by client", { entity: this.entityName, operation: "findByClient", cause: error });
    }
  }

  async findByStatus(status: string) {
    const start = Date.now();
    try {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq((schema.financeInvoices as any).status, status) as any);
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      return results as typeof schema.financeInvoices.$inferSelect[];
    } catch (error) {
      trackQuery(this.entityName, "findByStatus", Date.now() - start);
      throw new DatabaseError("Failed to find invoices by status", { entity: this.entityName, operation: "findByStatus", cause: error });
    }
  }
}
