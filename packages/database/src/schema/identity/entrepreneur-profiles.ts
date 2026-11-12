import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { personProfiles } from "./person-profiles";

export const entrepreneurProfiles = pgTable("entrepreneur_profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => personProfiles.id),
  founderStory: text("founder_story"),
  businessPhilosophy: text("business_philosophy"),
  missionStatement: text("mission_statement"),
  visionStatement: text("vision_statement"),
});
