import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

// ─── Subscribers ─────────────────────────────────────────────────────────────

export const subscriberSchema = z.object({
  id: uuidSchema,
  email: z.string().max(255),
  name: z.string().optional(),
  language: z.string().max(10).optional(),
  segments: z.array(z.string()).optional(),
  status: z.enum(["pending", "verified", "active", "unsubscribed", "bounced", "blocked"]),
  source: z.string().max(50).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createSubscriberSchema = z.object({
  email: z.string().max(255),
  name: z.string().optional(),
  language: z.string().max(10).optional(),
  segments: z.array(z.string()).optional(),
  status: z.enum(["pending", "verified", "active", "unsubscribed", "bounced", "blocked"]),
  source: z.string().max(50).optional(),
});

export const updateSubscriberSchema = subscriberSchema.partial();

// ─── Subscriber Segments ─────────────────────────────────────────────────────

export const subscriberSegmentSchema = z.object({
  subscriberId: uuidSchema,
  segment: z.string().max(50),
});

export const createSubscriberSegmentSchema = subscriberSegmentSchema;
export const updateSubscriberSegmentSchema = subscriberSegmentSchema.partial();

// ─── Subscriber Verifications ────────────────────────────────────────────────

export const subscriberVerificationSchema = z.object({
  id: uuidSchema,
  subscriberId: uuidSchema,
  token: z.string().max(500),
  expiresAt: timestampSchema,
  verifiedAt: timestampSchema.optional(),
  createdAt: timestampSchema,
});

export const createSubscriberVerificationSchema = z.object({
  subscriberId: uuidSchema,
  token: z.string().max(500),
  expiresAt: timestampSchema,
});

export const updateSubscriberVerificationSchema = subscriberVerificationSchema.partial();

// ─── Campaigns ───────────────────────────────────────────────────────────────

export const campaignSchema = z.object({
  id: uuidSchema,
  subject: z.string(),
  content: z.string(),
  segments: z.array(z.string()).optional(),
  scheduledAt: timestampSchema.optional(),
  status: z.enum(["draft", "scheduled", "sending", "sent", "failed"]),
  sentCount: z.coerce.number().int().optional(),
  openCount: z.coerce.number().int().optional(),
  clickCount: z.coerce.number().int().optional(),
  unsubscribeCount: z.coerce.number().int().optional(),
  bounceCount: z.coerce.number().int().optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
  sentAt: timestampSchema.optional(),
});

export const createCampaignSchema = z.object({
  subject: z.string(),
  content: z.string(),
  segments: z.array(z.string()).optional(),
  scheduledAt: timestampSchema.optional(),
  status: z.enum(["draft", "scheduled", "sending", "sent", "failed"]),
  createdBy: uuidSchema,
});

export const updateCampaignSchema = campaignSchema.partial();
