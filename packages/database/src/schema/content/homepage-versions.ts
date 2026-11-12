import { pgTable, uuid, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const homepageVersions = pgTable("homepage_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: integer("version"),
  snapshotJson: jsonb("snapshot_json"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
