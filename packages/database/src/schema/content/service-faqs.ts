import { pgTable, uuid, text, integer } from "drizzle-orm/pg-core";

export const serviceFaqs = pgTable("service_faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id"),
  question: text("question"),
  answer: text("answer"),
  sortOrder: integer("sort_order"),
});
