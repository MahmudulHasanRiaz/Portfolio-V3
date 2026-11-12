import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";

export const searchIndex = pgTable("search_index", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  title: text("title"),
  content: text("content"),
  summary: text("summary"),
  url: text("url"),
  thumbnail: text("thumbnail"),
  publishedAt: timestamp("published_at"),
  contentType: varchar("content_type", { length: 50 }),
  locale: varchar("locale", { length: 10 }),
}, (table) => ({
  entityIdx: index("idx_search_index_entity").on(table.entityType, table.entityId),
}));
