import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const subscriberVerifications = pgTable("subscriber_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriberId: uuid("subscriber_id"),
  token: varchar("token", { length: 500 }).unique(),
  expiresAt: timestamp("expires_at"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
