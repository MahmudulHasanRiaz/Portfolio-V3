import { pgTable, uuid, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const releaseVideos = pgTable("release_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id"),
  platformName: varchar("platform_name", { length: 100 }),
  videoUrl: text("video_url"),
  title: text("title"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
