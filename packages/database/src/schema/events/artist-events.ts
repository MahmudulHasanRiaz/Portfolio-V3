import { pgTable, uuid, text, varchar, boolean, numeric, time, integer, timestamp, date } from "drizzle-orm/pg-core";
import { eventStatus, attendanceStatus } from "../enums";

export const artistEvents = pgTable("artist_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  categoryId: uuid("category_id"),
  organizerName: text("organizer_name"),
  organizerContact: text("organizer_contact"),
  organizerId: uuid("organizer_id"),
  eventDate: date("event_date"),
  eventTime: time("event_time"),
  durationMinutes: integer("duration_minutes"),
  venueName: text("venue_name"),
  venueAddress: text("venue_address"),
  city: text("city"),
  country: text("country"),
  status: eventStatus("status").default("inquiry"),
  isPaid: boolean("is_paid").default(false),
  agreedFee: numeric("agreed_fee"),
  currency: varchar("currency", { length: 10 }),
  cancellationReason: text("cancellation_reason"),
  attendanceStatus: attendanceStatus("attendance_status"),
  notes: text("notes"),
  isPublic: boolean("is_public").default(true),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
