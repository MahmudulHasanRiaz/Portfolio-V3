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
