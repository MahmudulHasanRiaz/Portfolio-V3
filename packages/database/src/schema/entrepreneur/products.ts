import { pgTable, uuid, text, varchar, boolean, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { productStatus, contentStatus } from "../enums";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  ventureId: uuid("venture_id"),
  name: text("name"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  launchDate: date("launch_date"),
  url: text("url"),
  status: productStatus("status").default("active"),
  isFeatured: boolean("is_featured").default(false),
  contentStatus: contentStatus("content_status").default("draft"),
  media: jsonb("media"),
  highlights: jsonb("highlights"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
