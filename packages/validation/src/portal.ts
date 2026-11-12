import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

// ─── Portal Sessions ─────────────────────────────────────────────────────────

export const portalSessionSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  portalToken: z.string().max(500),
  clientEmail: z.string(),
  passwordHash: z.string().optional(),
  lastAccessedAt: timestampSchema.optional(),
  expiresAt: timestampSchema,
  createdAt: timestampSchema,
});

export const createPortalSessionSchema = z.object({
  projectId: uuidSchema,
  portalToken: z.string().max(500),
  clientEmail: z.string(),
  passwordHash: z.string().optional(),
  expiresAt: timestampSchema,
});

export const updatePortalSessionSchema = portalSessionSchema.partial();

// ─── Portal Messages ─────────────────────────────────────────────────────────

export const portalMessageSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  senderType: z.enum(["admin", "client"]),
  senderId: uuidSchema,
  message: z.string(),
  attachments: z.record(z.string(), z.unknown()).optional(),
  isRead: z.boolean(),
  createdAt: timestampSchema,
});

export const createPortalMessageSchema = z.object({
  projectId: uuidSchema,
  senderType: z.enum(["admin", "client"]),
  senderId: uuidSchema,
  message: z.string(),
  attachments: z.record(z.string(), z.unknown()).optional(),
  isRead: z.boolean(),
});

export const updatePortalMessageSchema = portalMessageSchema.partial();
