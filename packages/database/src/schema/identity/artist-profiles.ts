import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { personProfiles } from "./person-profiles";

export const artistProfiles = pgTable("artist_profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => personProfiles.id),
  artistName: text("artist_name"),
  biography: text("biography"),
  genre: text("genre"),
  bookingInfo: text("booking_info"),
});
