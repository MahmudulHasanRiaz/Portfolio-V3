import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { subscriberStatus } from "../enums";

export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique(),
  name: text("name"),
  language: varchar("language", { length: 10 }),
  segments: text("segments").array(),
  status: subscriberStatus("status"),
  source: varchar("source", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
