import { pgTable, uuid, text, boolean } from "drizzle-orm/pg-core";

export const eventLogistics = pgTable("event_logistics", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").unique(),
  travelRequired: boolean("travel_required").default(false),
  travelNotes: text("travel_notes"),
  accommodationRequired: boolean("accommodation_required").default(false),
  accommodationNotes: text("accommodation_notes"),
  soundRequirements: text("sound_requirements"),
  technicalRider: text("technical_rider"),
  greenRoomRequired: boolean("green_room_required").default(false),
  additionalNotes: text("additional_notes"),
});
