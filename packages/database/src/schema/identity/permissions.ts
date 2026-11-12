import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  group: varchar("group", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
