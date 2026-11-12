import { pgTable, uuid, jsonb, real, timestamp } from "drizzle-orm/pg-core";

export const formSubmissions = pgTable("form_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id"),
  data: jsonb("data"),
  leadId: uuid("lead_id"),
  spamScore: real("spam_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
