import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const visitorSessions = pgTable("visitor_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitorId: uuid("visitor_id").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }),
  landingPage: text("landing_page"),
  referrer: text("referrer"),
  isActive: boolean("is_active").default(true),
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  utmContent: varchar("utm_content", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
