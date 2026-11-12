import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const eventActivityLogs = pgTable("event_activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id"),
  actorId: uuid("actor_id"),
  action: text("action"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
