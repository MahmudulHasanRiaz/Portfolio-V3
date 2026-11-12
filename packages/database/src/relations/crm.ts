import { relations } from "drizzle-orm";
import * as schema from "../schema";

export const leadsRelations = relations(schema.leads, ({ one, many }) => ({
  assignedUser: one(schema.users, {
    fields: [schema.leads.assignedUserId],
    references: [schema.users.id],
  }),
  activities: many(schema.leadActivities),
  notes: many(schema.leadNotes),
  projectsFreelance: many(schema.projectsFreelance),
  artistEvents: many(schema.artistEvents),
  payments: many(schema.financePayments),
  invoices: many(schema.financeInvoices),
  proposalDocuments: many(schema.proposalDocuments),
}));

export const leadActivitiesRelations = relations(schema.leadActivities, ({ one }) => ({
  lead: one(schema.leads, {
    fields: [schema.leadActivities.leadId],
    references: [schema.leads.id],
  }),
}));

export const leadNotesRelations = relations(schema.leadNotes, ({ one }) => ({
  lead: one(schema.leads, {
    fields: [schema.leadNotes.leadId],
    references: [schema.leads.id],
  }),
}));

export const formsRelations = relations(schema.forms, ({ many }) => ({
  fields: many(schema.formFields),
  submissions: many(schema.formSubmissions),
  analytics: many(schema.formAnalytics),
}));

export const formFieldsRelations = relations(schema.formFields, ({ one }) => ({
  form: one(schema.forms, {
    fields: [schema.formFields.formId],
    references: [schema.forms.id],
  }),
}));

export const formSubmissionsRelations = relations(schema.formSubmissions, ({ one }) => ({
  form: one(schema.forms, {
    fields: [schema.formSubmissions.formId],
    references: [schema.forms.id],
  }),
}));

export const formAnalyticsRelations = relations(schema.formAnalytics, ({ one }) => ({
  form: one(schema.forms, {
    fields: [schema.formAnalytics.formId],
    references: [schema.forms.id],
  }),
}));

export const subscribersRelations = relations(schema.subscribers, ({ many }) => ({
  segments: many(schema.subscriberSegments),
  verifications: many(schema.subscriberVerifications),
}));

export const subscriberSegmentsRelations = relations(schema.subscriberSegments, ({ one }) => ({
  subscriber: one(schema.subscribers, {
    fields: [schema.subscriberSegments.subscriberId],
    references: [schema.subscribers.id],
  }),
}));

export const subscriberVerificationsRelations = relations(schema.subscriberVerifications, ({ one }) => ({
  subscriber: one(schema.subscribers, {
    fields: [schema.subscriberVerifications.subscriberId],
    references: [schema.subscribers.id],
  }),
}));
