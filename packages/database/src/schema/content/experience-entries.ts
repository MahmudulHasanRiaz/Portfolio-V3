import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Experience entries (0041) — the dedicated Experience page
// (/experience, PR #35). One river timeline weaving two kinds of
// entries in time order:
//   type = 'role'    — a job / org role: title = the role,
//                      organisation = the employer
//   type = 'project' — a project-basis engagement: title = the project
//                      name, organisation = the client, project_slug
//                      links to the live project detail page
// The user's work history has NOT been supplied, so the table starts
// EMPTY — he enters his real entries in the admin (Dashboard →
// Content → Experience). Never seed fake entries here. A NULL
// endDate means ongoing / present.
export const experienceEntries = pgTable("experience_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 20 }),
  title: text("title"),
  titleBn: text("title_bn"),
  organisation: text("organisation"),
  organisationBn: text("organisation_bn"),
  // Dates are plain calendar dates (no time component): a NULL
  // endDate means ongoing / present.
  startDate: date("start_date"),
  endDate: date("end_date"),
  // Summary / outcome — only shown when set. For project entries
  // this is the outcome of the engagement.
  description: text("description"),
  descriptionBn: text("description_bn"),
  // Project type only: the slug of the live project detail page
  // (/projects/<slug>). Empty for role entries.
  projectSlug: text("project_slug"),
  sortOrder: integer("sort_order"),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
