import { pgTable, uuid, text, boolean, timestamp, date } from "drizzle-orm/pg-core";

export const artistAvailability = pgTable("artist_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").unique(),
  isAvailable: boolean("is_available").default(true),
  note: text("note"),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
