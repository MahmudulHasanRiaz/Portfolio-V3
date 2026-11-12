import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

// ─── Proposal Templates ──────────────────────────────────────────────────────

export const proposalTemplateSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  projectCategoryId: uuidSchema.nullable(),
  clientType: z.string().optional(),
  type: z.enum(["proposal", "contract"]),
  content: z.string(),
  variables: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});

export const createProposalTemplateSchema = z.object({
  name: z.string(),
  projectCategoryId: uuidSchema.optional(),
  clientType: z.string().optional(),
  type: z.enum(["proposal", "contract"]),
  content: z.string(),
  variables: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean(),
  createdBy: uuidSchema,
});

export const updateProposalTemplateSchema = proposalTemplateSchema.partial();

// ─── Proposal Documents ──────────────────────────────────────────────────────

export const proposalDocumentSchema = z.object({
  id: uuidSchema,
  templateId: uuidSchema,
  projectId: uuidSchema,
  clientId: uuidSchema,
  resolvedContent: z.string(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]),
  version: z.coerce.number().int(),
  parentDocumentId: uuidSchema.optional(),
  pdfUrl: z.string().optional(),
  sentAt: timestampSchema.optional(),
  acceptedAt: timestampSchema.optional(),
  rejectedAt: timestampSchema.optional(),
  rejectionReason: z.string().optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
});

export const createProposalDocumentSchema = z.object({
  templateId: uuidSchema,
  projectId: uuidSchema,
  clientId: uuidSchema,
  resolvedContent: z.string(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]),
  pdfUrl: z.string().optional(),
  createdBy: uuidSchema,
});

export const updateProposalDocumentSchema = proposalDocumentSchema.partial();
