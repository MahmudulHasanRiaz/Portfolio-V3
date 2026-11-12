import { pgTable, uuid, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const contentRevisions = pgTable("content_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  revisionNumber: integer("revision_number"),
  contentSnapshot: jsonb("content_snapshot"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
