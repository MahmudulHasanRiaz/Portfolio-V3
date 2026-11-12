import { pgTable, uuid, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const ventureCategories = pgTable("venture_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
