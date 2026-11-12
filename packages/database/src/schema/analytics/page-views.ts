import { pgTable, uuid, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const pageViews = pgTable("page_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitorId: uuid("visitor_id"),
  sessionId: uuid("session_id"),
  path: text("path").notNull(),
  title: text("title"),
  referrer: text("referrer"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  utmContent: varchar("utm_content", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  leadId: uuid("lead_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
