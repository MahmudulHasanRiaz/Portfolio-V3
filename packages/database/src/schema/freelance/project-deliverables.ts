import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { deliverableStatus } from "../enums";

export const projectDeliverables = pgTable("project_deliverables", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id"),
  milestoneId: uuid("milestone_id"),
  title: text("title"),
  fileUrl: text("file_url"),
  notes: text("notes"),
  status: deliverableStatus("status").default("pending"),
  clientFeedback: text("client_feedback"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
});
