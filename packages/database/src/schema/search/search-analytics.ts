import { pgTable, uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const searchAnalytics = pgTable("search_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  query: text("query").notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  resultCount: integer("result_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
