import { pgTable, uuid, varchar, text, jsonb, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  triggerType: varchar("trigger_type", { length: 100 }).notNull(),
  triggerConfig: jsonb("trigger_config").$type<Record<string, unknown>>().default({}),
  actions: jsonb("actions").$type<{ type: string; config: Record<string, unknown>; order: number }[]>().notNull(),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  maxRetries: integer("max_retries").notNull().default(3),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
