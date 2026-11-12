import { z } from "zod";
import { uuidSchema, timestampSchema, slugSchema } from "./common";

// ─── Event Categories ────────────────────────────────────────────────────────

export const eventCategorySchema = z.object({
  id: uuidSchema,
  name: z.string().max(100),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  color: z.string().max(7).optional(),
  icon: z.string().optional(),
  createdAt: timestampSchema,
});

export const createEventCategorySchema = z.object({
  name: z.string().max(100),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  color: z.string().max(7).optional(),
  icon: z.string().optional(),
});

export const updateEventCategorySchema = eventCategorySchema.partial();

// ─── Artist Events ───────────────────────────────────────────────────────────

export const artistEventSchema = z.object({
  id: uuidSchema,
  title: z.string().optional(),
  categoryId: uuidSchema,
  organizerName: z.string().optional(),
  organizerContact: z.string().optional(),
  organizerId: uuidSchema.optional(),
  eventDate: z.string().optional(),
  eventTime: z.string().optional(),
  durationMinutes: z.coerce.number().int().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(["inquiry", "negotiating", "confirmed", "logistics_finalized", "completed", "declined", "cancelled", "archived"]).optional(),
  isPaid: z.boolean().optional(),
  agreedFee: z.coerce.number().optional(),
  currency: z.string().max(10).optional(),
  cancellationReason: z.string().optional(),
  attendanceStatus: z.enum(["attended", "did_not_attend"]).optional(),
  notes: z.string().optional(),
  isPublic: z.boolean().optional(),
  createdBy: uuidSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createArtistEventSchema = z.object({
  title: z.string().optional(),
  categoryId: uuidSchema,
  organizerName: z.string().optional(),
  organizerContact: z.string().optional(),
  organizerId: uuidSchema.optional(),
  eventDate: z.string().optional(),
  eventTime: z.string().optional(),
  durationMinutes: z.coerce.number().int().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(["inquiry", "negotiating", "confirmed", "logistics_finalized", "completed", "declined", "cancelled", "archived"]).optional(),
  isPaid: z.boolean().optional(),
  agreedFee: z.coerce.number().optional(),
  currency: z.string().max(10).optional(),
  cancellationReason: z.string().optional(),
  attendanceStatus: z.enum(["attended", "did_not_attend"]).optional(),
  notes: z.string().optional(),
  isPublic: z.boolean().optional(),
  createdBy: uuidSchema.optional(),
});

export const updateArtistEventSchema = artistEventSchema.partial();

// ─── Event Logistics ─────────────────────────────────────────────────────────

export const eventLogisticSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  travelRequired: z.boolean().optional(),
  travelNotes: z.string().optional(),
  accommodationRequired: z.boolean().optional(),
  accommodationNotes: z.string().optional(),
  soundRequirements: z.string().optional(),
  technicalRider: z.string().optional(),
  greenRoomRequired: z.boolean().optional(),
  additionalNotes: z.string().optional(),
});

export const createEventLogisticSchema = z.object({
  eventId: uuidSchema,
  travelRequired: z.boolean().optional(),
  travelNotes: z.string().optional(),
  accommodationRequired: z.boolean().optional(),
  accommodationNotes: z.string().optional(),
  soundRequirements: z.string().optional(),
  technicalRider: z.string().optional(),
  greenRoomRequired: z.boolean().optional(),
  additionalNotes: z.string().optional(),
});

export const updateEventLogisticSchema = eventLogisticSchema.partial();

// ─── Event Activity Logs ─────────────────────────────────────────────────────

export const eventActivityLogSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  actorId: uuidSchema,
  action: z.string(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: timestampSchema,
});

export const createEventActivityLogSchema = z.object({
  eventId: uuidSchema,
  actorId: uuidSchema,
  action: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateEventActivityLogSchema = eventActivityLogSchema.partial();

// ─── Artist Availability ─────────────────────────────────────────────────────

export const artistAvailabilitySchema = z.object({
  id: uuidSchema,
  date: z.string(),
  isAvailable: z.boolean(),
  note: z.string().optional(),
  createdBy: uuidSchema.optional(),
  updatedAt: timestampSchema,
});

export const createArtistAvailabilitySchema = z.object({
  date: z.string(),
  isAvailable: z.boolean(),
  note: z.string().optional(),
  createdBy: uuidSchema.optional(),
});

export const updateArtistAvailabilitySchema = artistAvailabilitySchema.partial();
