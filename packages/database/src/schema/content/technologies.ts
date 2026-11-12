import { pgTable, uuid, text, varchar, integer } from "drizzle-orm/pg-core";

export const technologies = pgTable("technologies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }),
  // name_bn (0032): Bangla twin of name (0018 pattern) — optional,
  // API falls back to English when empty. Tech names usually stay
  // English; the column exists so the admin CAN set a Bangla name
  // where one reads better (e.g. a transliterated display name).
  nameBn: text("name_bn"),
  category: varchar("category", { length: 50 }),
  icon: text("icon"),
  // "use" (0026): what the tech is used for, ONLY where he stated one in
  // his own words (live STACK: PHP = "Plugin development"; all others
  // NULL). Never invented.
  use: text("use"),
  // use_bn (0032): Bangla twin of use (0018 pattern) — optional,
  // API falls back to English when empty.
  useBn: text("use_bn"),
  sortOrder: integer("sort_order"),
});
