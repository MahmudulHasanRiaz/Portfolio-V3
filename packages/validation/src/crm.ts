import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

// ─── Leads ───────────────────────────────────────────────────────────────────

export const leadSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
  email: z.string().max(255),
  phone: z.string().max(50).optional(),
  company: z.string().optional(),
  country: z.string().max(100).optional(),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  projectType: z.string().optional(),
  inquiryType: z.string().max(50).optional(),
  message: z.string().optional(),
  leadSource: z.string().max(50).optional(),
  status: z.enum(["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost", "archived"]),
  assignedUserId: uuidSchema.optional(),
  followUpDate: z.string().optional(),
  followUpNotes: z.string().optional(),
  convertedToProjectId: uuidSchema.optional(),
  convertedToEventId: uuidSchema.optional(),
  utmSource: z.string().max(255).optional(),
  utmMedium: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmContent: z.string().max(255).optional(),
  utmTerm: z.string().max(255).optional(),
  slaMinutes: z.coerce.number().int().default(15),
  firstResponseAt: timestampSchema.optional(),
  responseStatus: z.enum(["within_sla", "warning", "breached"]).optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createLeadSchema = z.object({
  fullName: z.string(),
  email: z.string().max(255),
  phone: z.string().max(50).optional(),
  company: z.string().optional(),
  country: z.string().max(100).optional(),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  projectType: z.string().optional(),
  inquiryType: z.string().max(50).optional(),
  message: z.string().optional(),
  leadSource: z.string().max(50).optional(),
  status: z.enum(["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost", "archived"]),
  assignedUserId: uuidSchema.optional(),
  followUpDate: z.string().optional(),
  followUpNotes: z.string().optional(),
  convertedToProjectId: uuidSchema.optional(),
  convertedToEventId: uuidSchema.optional(),
  utmSource: z.string().max(255).optional(),
  utmMedium: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmContent: z.string().max(255).optional(),
  utmTerm: z.string().max(255).optional(),
  firstResponseAt: timestampSchema.optional(),
  responseStatus: z.enum(["within_sla", "warning", "breached"]).optional(),
  createdBy: uuidSchema,
});

export const updateLeadSchema = leadSchema.partial();

// ─── Lead Activities ─────────────────────────────────────────────────────────

export const leadActivitySchema = z.object({
  id: uuidSchema,
  leadId: uuidSchema,
  activityType: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});

export const createLeadActivitySchema = z.object({
  leadId: uuidSchema,
  activityType: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdBy: uuidSchema,
});

export const updateLeadActivitySchema = leadActivitySchema.partial();

// ─── Lead Notes ──────────────────────────────────────────────────────────────

export const leadNoteSchema = z.object({
  id: uuidSchema,
  leadId: uuidSchema,
  note: z.string(),
  isInternal: z.boolean().default(true),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});

export const createLeadNoteSchema = z.object({
  leadId: uuidSchema,
  note: z.string(),
  isInternal: z.boolean().default(true),
  createdBy: uuidSchema,
});

export const updateLeadNoteSchema = leadNoteSchema.partial();

// ─── Abandoned Leads ─────────────────────────────────────────────────────────

export const abandonedLeadSchema = z.object({
  id: uuidSchema,
  email: z.string().max(255),
  phone: z.string().max(50).optional(),
  sourcePage: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  capturedAt: timestampSchema,
});

export const createAbandonedLeadSchema = z.object({
  email: z.string().max(255),
  phone: z.string().max(50).optional(),
  sourcePage: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateAbandonedLeadSchema = abandonedLeadSchema.partial();
