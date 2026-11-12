import { pgTable, uuid, text, varchar, boolean, timestamp, date, numeric, jsonb } from "drizzle-orm/pg-core";
import { freelanceProjectStatus } from "../enums";

export const projectsFreelance = pgTable("projects_freelance", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  clientId: uuid("client_id"),
  categoryId: uuid("category_id"),
  status: freelanceProjectStatus("status").default("draft"),
  description: text("description"),
  scopeNotes: text("scope_notes"),
  startDate: date("start_date"),
  expectedEndDate: date("expected_end_date"),
  actualEndDate: date("actual_end_date"),
  totalAgreedAmount: numeric("total_agreed_amount"),
  currency: varchar("currency", { length: 10 }),
  isPaidProject: boolean("is_paid_project").default(false),
  assignedTo: uuid("assigned_to").array(),
  subcontractors: jsonb("subcontractors"),
  tags: text("tags").array(),
  portalAccessEnabled: boolean("portal_access_enabled").default(false),
  portalToken: varchar("portal_token", { length: 255 }).unique(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
