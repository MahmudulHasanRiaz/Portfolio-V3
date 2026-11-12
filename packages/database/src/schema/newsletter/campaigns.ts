import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { campaignStatus } from "../enums";

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  subject: text("subject"),
  content: text("content"),
  segments: text("segments").array(),
  scheduledAt: timestamp("scheduled_at"),
  status: campaignStatus("status"),
  sentCount: integer("sent_count"),
  openCount: integer("open_count"),
  clickCount: integer("click_count"),
  unsubscribeCount: integer("unsubscribe_count"),
  bounceCount: integer("bounce_count"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
});
