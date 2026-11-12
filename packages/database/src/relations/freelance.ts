import { relations } from "drizzle-orm";
import * as schema from "../schema";

export const projectCategoriesRelations = relations(schema.projectCategories, ({ many }) => ({
  projectsFreelance: many(schema.projectsFreelance),
  proposalTemplates: many(schema.proposalTemplates),
}));

export const projectsFreelanceRelations = relations(schema.projectsFreelance, ({ one, many }) => ({
  category: one(schema.projectCategories, {
    fields: [schema.projectsFreelance.categoryId],
    references: [schema.projectCategories.id],
  }),
  client: one(schema.leads, {
    fields: [schema.projectsFreelance.clientId],
    references: [schema.leads.id],
  }),
  milestones: many(schema.projectMilestones),
  deliverables: many(schema.projectDeliverables),
  activityLogs: many(schema.projectActivityLogs),
  portalSession: one(schema.portalSessions),
  portalMessages: many(schema.portalMessages),
  proposalDocuments: many(schema.proposalDocuments),
}));

export const projectMilestonesRelations = relations(schema.projectMilestones, ({ one, many }) => ({
  project: one(schema.projectsFreelance, {
    fields: [schema.projectMilestones.projectId],
    references: [schema.projectsFreelance.id],
  }),
  deliverables: many(schema.projectDeliverables),
}));

export const projectDeliverablesRelations = relations(schema.projectDeliverables, ({ one }) => ({
  project: one(schema.projectsFreelance, {
    fields: [schema.projectDeliverables.projectId],
    references: [schema.projectsFreelance.id],
  }),
  milestone: one(schema.projectMilestones, {
    fields: [schema.projectDeliverables.milestoneId],
    references: [schema.projectMilestones.id],
  }),
}));

export const projectActivityLogsRelations = relations(schema.projectActivityLogs, ({ one }) => ({
  project: one(schema.projectsFreelance, {
    fields: [schema.projectActivityLogs.projectId],
    references: [schema.projectsFreelance.id],
  }),
}));

export const eventCategoriesRelations = relations(schema.eventCategories, ({ many }) => ({
  artistEvents: many(schema.artistEvents),
}));

export const artistEventsRelations = relations(schema.artistEvents, ({ one, many }) => ({
  category: one(schema.eventCategories, {
    fields: [schema.artistEvents.categoryId],
    references: [schema.eventCategories.id],
  }),
  organizer: one(schema.leads, {
    fields: [schema.artistEvents.organizerId],
    references: [schema.leads.id],
  }),
  logistics: one(schema.eventLogistics),
  activityLogs: many(schema.eventActivityLogs),
}));

export const eventLogisticsRelations = relations(schema.eventLogistics, ({ one }) => ({
  event: one(schema.artistEvents, {
    fields: [schema.eventLogistics.eventId],
    references: [schema.artistEvents.id],
  }),
}));

export const eventActivityLogsRelations = relations(schema.eventActivityLogs, ({ one }) => ({
  event: one(schema.artistEvents, {
    fields: [schema.eventActivityLogs.eventId],
    references: [schema.artistEvents.id],
  }),
}));
