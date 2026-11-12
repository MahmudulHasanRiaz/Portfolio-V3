import { pgTable, uuid, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { proposalType } from "../enums";

export const proposalTemplates = pgTable("proposal_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  projectCategoryId: uuid("project_category_id"),
  clientType: text("client_type"),
  type: proposalType("type"),
  content: text("content"),
  variables: jsonb("variables"),
  isActive: boolean("is_active"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
