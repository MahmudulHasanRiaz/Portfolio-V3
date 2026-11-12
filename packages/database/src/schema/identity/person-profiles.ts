import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const personProfiles = pgTable("person_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name"),
  headline: text("headline"),
  bioShort: text("bio_short"),
  bioLong: text("bio_long"),
  profileImage: text("profile_image"),
  coverImage: text("cover_image"),
  location: text("location"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  resumeUrl: text("resume_url"),
  pressKitUrl: text("press_kit_url"),
  socialLinks: jsonb("social_links"),
  streamingLinks: jsonb("streaming_links"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
