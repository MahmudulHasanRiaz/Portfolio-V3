import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const leadNotes = pgTable("lead_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id"),
  note: text("note"),
  isInternal: boolean("is_internal").default(true),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
