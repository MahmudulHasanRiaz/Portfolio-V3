import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";

// Case-study tags join (0028) — follows the existing postTags pattern
// exactly (two uuid columns, composite primary key, no foreign keys).
export const caseStudyTags = pgTable("case_study_tags", {
  caseStudyId: uuid("case_study_id"),
  tagId: uuid("tag_id"),
}, (table) => ({
  pk: primaryKey({ columns: [table.caseStudyId, table.tagId] }),
}));
