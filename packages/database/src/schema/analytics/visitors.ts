import { pgTable, uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const visitors = pgTable("visitors", {
  id: uuid("id").primaryKey().defaultRandom(),
  anonymousId: varchar("anonymous_id", { length: 255 }).notNull().unique(),
  firstVisit: timestamp("first_visit", { withTimezone: true }).defaultNow(),
  lastVisit: timestamp("last_visit", { withTimezone: true }).defaultNow(),
  visitCount: integer("visit_count").default(1),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
