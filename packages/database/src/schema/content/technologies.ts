import { pgTable, uuid, text, varchar, integer, boolean } from "drizzle-orm/pg-core";

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
  // proficiency (0039): 0–100, optional; NULL = no bar shown on the
  // Skills page. Never seeded — the admin sets it per skill, or it
  // stays unset.
  proficiency: integer("proficiency"),
  // journey_stage (0039): which stage of his skill journey the tech
  // belongs to — 'software' | 'graphic_design' | 'digital_marketing'.
  // NULL = 'software' (all 45 existing rows). The Skills page shows
  // software skills prominently on top and the earlier stages in a
  // de-emphasized Journey section below.
  journeyStage: varchar("journey_stage", { length: 30 }),
  // is_visible (0039): hide a skill from the Skills page without
  // deleting it. NULL = visible.
  isVisible: boolean("is_visible"),
});
