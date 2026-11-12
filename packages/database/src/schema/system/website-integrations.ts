import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const websiteIntegrations = pgTable("website_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  tokenPrefix: varchar("token_prefix", { length: 16 }).notNull(),
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
