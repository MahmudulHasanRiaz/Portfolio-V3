import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

// ─── Timeline Events ─────────────────────────────────────────────────────────

export const timelineEventSchema = z.object({
  id: uuidSchema,
  sourceType: z.string().max(50),
  sourceId: uuidSchema,
  eventType: z.string().max(50),
  title: z.string(),
  description: z.string().optional(),
  eventDate: z.string(),
  icon: z.string().optional(),
  url: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  createdAt: timestampSchema,
});

export const createTimelineEventSchema = z.object({
  sourceType: z.string().max(50),
  sourceId: uuidSchema,
  eventType: z.string().max(50),
  title: z.string(),
  description: z.string().optional(),
  eventDate: z.string(),
  icon: z.string().optional(),
  url: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateTimelineEventSchema = timelineEventSchema.partial();
