import { pgTable, uuid, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

// Platforms (0025): the 17 platform rows the Astro public site renders
// (All-platforms page, Combined music chips, footer primaries, WhatsApp
// contact). Seeded verbatim from the live PLATFORMS copy
// (Portfolio-Public src/data/site.ts). "group" is music | social |
// professional; icon is a Simple Icons slug, a "wikimedia:<url>" logo,
// or null for a plain chip. name_bn / subtitle_bn are the Bangla twins
// (0018 pattern): optional, API falls back to English when empty.
export const platforms = pgTable("platforms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  url: text("url").notNull(),
  handle: text("handle"),
  group: text("group").notNull(),
  icon: text("icon"),
  subtitle: text("subtitle"),
  subtitleBn: text("subtitle_bn"),
  note: text("note"),
  isPrimary: boolean("is_primary").default(false),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
