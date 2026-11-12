import { pgTable, uuid, varchar, text, jsonb, integer, timestamp } from "drizzle-orm/pg-core";

export const workflowLogs = pgTable("workflow_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull(),
  actionType: varchar("action_type", { length: 100 }).notNull(),
  actionOrder: integer("action_order").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  input: jsonb("input").$type<Record<string, unknown>>().default({}),
  output: jsonb("output").$type<Record<string, unknown>>().default({}),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
