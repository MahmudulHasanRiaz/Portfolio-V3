import { pgTable, uuid, date, integer, real } from "drizzle-orm/pg-core";

export const formAnalytics = pgTable("form_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id"),
  date: date("date"),
  views: integer("views"),
  starts: integer("starts"),
  submissions: integer("submissions"),
  abandonments: integer("abandonments"),
  conversionRate: real("conversion_rate"),
});
