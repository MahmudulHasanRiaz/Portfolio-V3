import { pgTable, uuid, text, varchar, integer } from "drizzle-orm/pg-core";

export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question"),
  answer: text("answer"),
  sortOrder: integer("sort_order"),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
});
