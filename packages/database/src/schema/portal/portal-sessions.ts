import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const portalSessions = pgTable("portal_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").unique(),
  portalToken: varchar("portal_token", { length: 500 }).unique(),
  clientEmail: text("client_email"),
  passwordHash: text("password_hash"),
  lastAccessedAt: timestamp("last_accessed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
