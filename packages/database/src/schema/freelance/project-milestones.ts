import { pgTable, uuid, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { milestoneStatus } from "../enums";

export const projectMilestones = pgTable("project_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id"),
  title: text("title"),
  description: text("description"),
  dueDate: date("due_date"),
  status: milestoneStatus("status").default("pending"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
