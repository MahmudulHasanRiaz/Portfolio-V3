import { pgTable, uuid, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { testimonialSourceType, testimonialStatus } from "../enums";

export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorName: text("author_name"),
  authorTitle: text("author_title"),
  authorAvatar: text("author_avatar"),
  content: text("content"),
  sourceType: testimonialSourceType("source_type"),
  projectId: uuid("project_id"),
  eventId: uuid("event_id"),
  rating: integer("rating"),
  isFeatured: boolean("is_featured"),
  // isPreview (0010) marks dummy preview rows (0011).
  isPreview: boolean("is_preview").default(false),
  status: testimonialStatus("status"),
  displayOrder: integer("display_order"),
  createdAt: timestamp("created_at").defaultNow(),
});
