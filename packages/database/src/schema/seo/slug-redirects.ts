import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const slugRedirects = pgTable("slug_redirects", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceSlug: varchar("source_slug", { length: 255 }),
  destinationUrl: text("destination_url"),
  redirectType: integer("redirect_type"),
  entityType: varchar("entity_type", { length: 50 }),
  isActive: boolean("is_active"),
  createdAt: timestamp("created_at").defaultNow(),
});
