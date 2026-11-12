import { pgTable, uuid, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const eventCategories = pgTable("event_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 7 }),
  icon: text("icon"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
