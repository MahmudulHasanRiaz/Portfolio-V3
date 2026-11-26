import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

// ─── Project Categories ──────────────────────────────────────────────────────


// ─── Projects (Freelance) ────────────────────────────────────────────────────

export const projectsFreelanceSchema = z.object({
  id: uuidSchema,
  title: z.string().optional(),
  clientId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  status: z.enum(["draft", "in_progress", "under_review", "revision_requested", "completed", "archived"]).optional(),
  description: z.string().optional(),
  scopeNotes: z.string().optional(),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  totalAgreedAmount: z.coerce.number().optional(),
  currency: z.string().max(10).optional(),
  isPaidProject: z.boolean().optional(),
  assignedTo: z.array(uuidSchema).optional(),
  subcontractors: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  portalAccessEnabled: z.boolean().optional(),
  portalToken: z.string().max(255).optional(),
  createdBy: uuidSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createProjectsFreelanceSchema = z.object({
  title: z.string().optional(),
  clientId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  status: z.enum(["draft", "in_progress", "under_review", "revision_requested", "completed", "archived"]).optional(),
  description: z.string().optional(),
  scopeNotes: z.string().optional(),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  totalAgreedAmount: z.coerce.number().optional(),
  currency: z.string().max(10).optional(),
  isPaidProject: z.boolean().optional(),
  assignedTo: z.array(uuidSchema).optional(),
  subcontractors: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  portalAccessEnabled: z.boolean().optional(),
  portalToken: z.string().max(255).optional(),
  createdBy: uuidSchema.optional(),
});

export const updateProjectsFreelanceSchema = projectsFreelanceSchema.partial();

// ─── Project Milestones ──────────────────────────────────────────────────────

export const projectMilestoneSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "approved"]).optional(),
  sortOrder: z.coerce.number().int().optional(),
  createdAt: timestampSchema,
});

export const createProjectMilestoneSchema = z.object({
  projectId: uuidSchema,
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "approved"]).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateProjectMilestoneSchema = projectMilestoneSchema.partial();

// ─── Project Deliverables ────────────────────────────────────────────────────

export const projectDeliverableSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  milestoneId: uuidSchema.optional(),
  title: z.string().optional(),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "submitted", "approved", "revision_requested"]).optional(),
  clientFeedback: z.string().optional(),
  submittedAt: timestampSchema.optional(),
  approvedAt: timestampSchema.optional(),
});

export const createProjectDeliverableSchema = z.object({
  projectId: uuidSchema,
  milestoneId: uuidSchema.optional(),
  title: z.string().optional(),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "submitted", "approved", "revision_requested"]).optional(),
  clientFeedback: z.string().optional(),
});

export const updateProjectDeliverableSchema = projectDeliverableSchema.partial();
