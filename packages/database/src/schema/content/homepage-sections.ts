import { pgTable, uuid, varchar, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const homepageSections = pgTable("homepage_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectionKey: varchar("section_key", { length: 100 }).unique().notNull(),
  isVisible: boolean("is_visible").default(true),
  sortOrder: integer("sort_order"),
  content: jsonb("content"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
