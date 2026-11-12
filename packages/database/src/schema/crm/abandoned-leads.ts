import { pgTable, uuid, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const abandonedLeads = pgTable("abandoned_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  sourcePage: text("source_page"),
  metadata: jsonb("metadata"),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow(),
});
