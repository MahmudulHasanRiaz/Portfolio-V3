import { pgTable, uuid, varchar, jsonb, integer, timestamp } from "drizzle-orm/pg-core";

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").notNull(),
  workflowVersion: integer("workflow_version").notNull(),
  triggerType: varchar("trigger_type", { length: 100 }).notNull(),
  triggerEntityId: uuid("trigger_entity_id"),
  triggerPayload: jsonb("trigger_payload").$type<Record<string, unknown>>().default({}),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  retryCount: integer("retry_count").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
