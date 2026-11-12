import { pgTable, uuid, varchar, text, boolean } from "drizzle-orm/pg-core";

export const searchSynonyms = pgTable("search_synonyms", {
  id: uuid("id").primaryKey().defaultRandom(),
  term: varchar("term", { length: 255 }),
  synonyms: text("synonyms").array(),
  isEnabled: boolean("is_enabled").notNull().default(true),
});
