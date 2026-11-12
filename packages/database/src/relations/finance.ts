import { relations } from "drizzle-orm";
import * as schema from "../schema";

export const paymentMethodsRelations = relations(schema.paymentMethods, ({ many }) => ({
  payments: many(schema.financePayments),
  expenses: many(schema.financeExpenses),
}));

export const financePaymentsRelations = relations(schema.financePayments, ({ one }) => ({
  paymentMethod: one(schema.paymentMethods, {
    fields: [schema.financePayments.paymentMethodId],
    references: [schema.paymentMethods.id],
  }),
  client: one(schema.leads, {
    fields: [schema.financePayments.clientId],
    references: [schema.leads.id],
  }),
  invoice: one(schema.financeInvoices, {
    fields: [schema.financePayments.invoiceId],
    references: [schema.financeInvoices.id],
  }),
}));

export const financeExpensesRelations = relations(schema.financeExpenses, ({ one }) => ({
  paymentMethod: one(schema.paymentMethods, {
    fields: [schema.financeExpenses.paymentMethodId],
    references: [schema.paymentMethods.id],
  }),
}));

export const financeInvoicesRelations = relations(schema.financeInvoices, ({ one, many }) => ({
  client: one(schema.leads, {
    fields: [schema.financeInvoices.clientId],
    references: [schema.leads.id],
  }),
  payments: many(schema.financePayments),
}));

export const portalSessionsRelations = relations(schema.portalSessions, ({ one }) => ({
  project: one(schema.projectsFreelance, {
    fields: [schema.portalSessions.projectId],
    references: [schema.projectsFreelance.id],
  }),
}));

export const portalMessagesRelations = relations(schema.portalMessages, ({ one }) => ({
  project: one(schema.projectsFreelance, {
    fields: [schema.portalMessages.projectId],
    references: [schema.projectsFreelance.id],
  }),
}));

export const proposalTemplatesRelations = relations(schema.proposalTemplates, ({ one, many }) => ({
  projectCategory: one(schema.projectCategories, {
    fields: [schema.proposalTemplates.projectCategoryId],
    references: [schema.projectCategories.id],
  }),
  documents: many(schema.proposalDocuments),
}));

export const proposalDocumentsRelations = relations(schema.proposalDocuments, ({ one }) => ({
  template: one(schema.proposalTemplates, {
    fields: [schema.proposalDocuments.templateId],
    references: [schema.proposalTemplates.id],
  }),
  project: one(schema.projectsFreelance, {
    fields: [schema.proposalDocuments.projectId],
    references: [schema.projectsFreelance.id],
  }),
  client: one(schema.leads, {
    fields: [schema.proposalDocuments.clientId],
    references: [schema.leads.id],
  }),
}));
