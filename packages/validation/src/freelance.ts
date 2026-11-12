import { z } from "zod";
import { uuidSchema, timestampSchema, slugSchema } from "./common";

// ─── Project Categories ──────────────────────────────────────────────────────

export const projectCategorySchema = z.object({
  id: uuidSchema,
  name: z.string().max(100),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  color: z.string().max(7).optional(),
  icon: z.string().optional(),
  createdAt: timestampSchema,
});

export const createProjectCategorySchema = z.object({
  name: z.string().max(100),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  color: z.string().max(7).optional(),
  icon: z.string().optional(),
});

export const updateProjectCategorySchema = projectCategorySchema.partial();

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
  subcontractors: z.record(z.unknown()).optional(),
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
  subcontractors: z.record(z.unknown()).optional(),
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

// ─── Project Activity Logs ───────────────────────────────────────────────────

export const projectActivityLogSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  actorId: uuidSchema,
  action: z.string(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: timestampSchema,
});

export const createProjectActivityLogSchema = z.object({
  projectId: uuidSchema,
  actorId: uuidSchema,
  action: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateProjectActivityLogSchema = projectActivityLogSchema.partial();
