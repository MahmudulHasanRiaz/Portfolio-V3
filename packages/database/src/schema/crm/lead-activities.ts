import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const leadActivities = pgTable("lead_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id"),
  activityType: text("activity_type"),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
