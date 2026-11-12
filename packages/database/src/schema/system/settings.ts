import { pgTable, uuid, varchar, jsonb, text, timestamp } from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 255 }).unique(),
  value: jsonb("value"),
  group: varchar("group", { length: 100 }),
  description: text("description"),
  updatedBy: uuid("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
