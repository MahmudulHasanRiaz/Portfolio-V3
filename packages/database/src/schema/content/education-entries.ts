import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
} from "drizzle-orm/pg-core";

// Education entries (0039) — the dedicated Education page
// (/education, PR #22). The user's own education history has NOT
// been supplied, so the table starts EMPTY — he enters his real
// entries in the admin (Dashboard → Content → Education). Never
// seed fake entries here.
export const educationEntries = pgTable("education_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  degree: text("degree"),
  degreeBn: text("degree_bn"),
  institution: text("institution"),
  institutionBn: text("institution_bn"),
  fieldOfStudy: text("field_of_study"),
  // Dates are plain calendar dates (no time component): a NULL
  // endDate means ongoing / present.
  startDate: date("start_date"),
  endDate: date("end_date"),
  // Grade / GPA / achievement, free text — only shown when set.
  grade: text("grade"),
  description: text("description"),
  descriptionBn: text("description_bn"),
  sortOrder: integer("sort_order"),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
