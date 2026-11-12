import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

// Clients (0027): the client wall the Astro public site renders.
// Seeded verbatim from the live CLIENTS copy (Portfolio-Public
// src/data/site.ts): Fixed Plus, Avelto. logo_url / website stay null
// until an admin adds them; name_bn is the Bangla twin (0018 pattern).
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  logoUrl: text("logo_url"),
  website: text("website"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
