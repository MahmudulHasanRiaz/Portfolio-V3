import { pgTable, uuid, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const forms = pgTable("forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  slug: varchar("slug", { length: 255 }).unique(),
  formType: varchar("form_type", { length: 50 }),
  description: text("description"),
  isActive: boolean("is_active"),
  successMessage: text("success_message"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
