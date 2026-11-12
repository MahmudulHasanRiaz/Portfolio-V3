import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const projectActivityLogs = pgTable("project_activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id"),
  actorId: uuid("actor_id"),
  action: text("action"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
