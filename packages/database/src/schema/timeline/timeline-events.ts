import { pgTable, uuid, varchar, text, date, integer, timestamp } from "drizzle-orm/pg-core";

export const timelineEvents = pgTable("timeline_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: uuid("source_id"),
  eventType: varchar("event_type", { length: 50 }),
  title: text("title"),
  description: text("description"),
  eventDate: date("event_date"),
  icon: text("icon"),
  url: text("url"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
});
