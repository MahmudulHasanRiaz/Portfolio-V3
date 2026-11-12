import { pgTable, uuid, text, varchar } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }),
  slug: varchar("slug", { length: 255 }).unique(),
  description: text("description"),
  type: varchar("type", { length: 50 }),
});
