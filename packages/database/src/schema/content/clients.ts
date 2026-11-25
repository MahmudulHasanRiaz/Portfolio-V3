import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

// Clients (0027): the client wall the Astro public site renders.
// Seeded verbatim from the live CLIENTS copy (Portfolio-Public
// src/data/site.ts): Fixed Plus, Avelto. logo_url / website stay null
// until an admin adds them; name_bn is the Bangla twin (0018 pattern).
// logo_display_mode (0036): how a set logo renders — "logo" (default,
// NULL) shows the logo image only, "name_logo" shows a square icon
// beside the name. NULL means "logo": existing rows keep their
// current rendering.
// logo_tone (0040): which the logo IS — "dark" (default, NULL) is a
// dark logo (black text / dark shapes) rendered on a LIGHT tile in
// both themes; "light" is a white/light logo rendered on a DARK tile
// in both themes. A fixed tile colour cannot serve both, so the tone
// is recorded per client instead of per brand in code.
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  logoUrl: text("logo_url"),
  logoDisplayMode: text("logo_display_mode"),
  logoTone: text("logo_tone"),
  website: text("website"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
