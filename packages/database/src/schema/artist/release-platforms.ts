import { pgTable, uuid, text, varchar } from "drizzle-orm/pg-core";

export const releasePlatforms = pgTable("release_platforms", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id"),
  platformName: varchar("platform_name", { length: 100 }),
  platformUrl: text("platform_url"),
});
