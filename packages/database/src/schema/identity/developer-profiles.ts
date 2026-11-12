import { pgTable, uuid, integer, jsonb, text } from "drizzle-orm/pg-core";
import { personProfiles } from "./person-profiles";

export const developerProfiles = pgTable("developer_profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => personProfiles.id),
  yearsExperience: integer("years_experience"),
  skills: jsonb("skills"),
  certifications: jsonb("certifications"),
  resumeText: text("resume_text"),
});
