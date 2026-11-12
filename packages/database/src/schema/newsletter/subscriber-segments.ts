import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const subscriberSegments = pgTable("subscriber_segments", {
  subscriberId: uuid("subscriber_id"),
  segment: varchar("segment", { length: 50 }),
});
