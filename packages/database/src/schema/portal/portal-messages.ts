import { pgTable, uuid, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { portalSenderType } from "../enums";

export const portalMessages = pgTable("portal_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id"),
  senderType: portalSenderType("sender_type"),
  senderId: uuid("sender_id"),
  message: text("message"),
  attachments: jsonb("attachments"),
  isRead: boolean("is_read"),
  createdAt: timestamp("created_at").defaultNow(),
});
