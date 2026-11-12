import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingSchema = z.object({
  id: uuidSchema,
  key: z.string().max(255),
  value: z.record(z.unknown()),
  group: z.string().max(100),
  description: z.string().optional(),
  updatedBy: uuidSchema.optional(),
  updatedAt: timestampSchema,
});

export const createSettingSchema = z.object({
  key: z.string().max(255),
  value: z.record(z.unknown()),
  group: z.string().max(100),
  description: z.string().optional(),
  updatedBy: uuidSchema.optional(),
});

export const updateSettingSchema = settingSchema.partial();

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export const auditLogSchema = z.object({
  id: uuidSchema,
  actorId: uuidSchema,
  action: z.string(),
  entityType: z.string().max(50),
  entityId: uuidSchema,
  metadata: z.record(z.unknown()).optional(),
  ipAddress: z.string().max(45).optional(),
  createdAt: timestampSchema,
});

export const createAuditLogSchema = z.object({
  actorId: uuidSchema,
  action: z.string(),
  entityType: z.string().max(50),
  entityId: uuidSchema,
  metadata: z.record(z.unknown()).optional(),
  ipAddress: z.string().max(45).optional(),
});

export const updateAuditLogSchema = auditLogSchema.partial();

// ─── Content Revisions ───────────────────────────────────────────────────────

export const contentRevisionSchema = z.object({
  id: uuidSchema,
  entityType: z.string().max(50),
  entityId: uuidSchema,
  revisionNumber: z.coerce.number().int(),
  contentSnapshot: z.record(z.unknown()),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});

export const createContentRevisionSchema = z.object({
  entityType: z.string().max(50),
  entityId: uuidSchema,
  revisionNumber: z.coerce.number().int(),
  contentSnapshot: z.record(z.unknown()),
  createdBy: uuidSchema,
});

export const updateContentRevisionSchema = contentRevisionSchema.partial();
