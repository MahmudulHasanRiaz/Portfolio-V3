import { z } from "zod";
import { uuidSchema, timestampSchema, slugSchema } from "./common";

// ─── Forms ───────────────────────────────────────────────────────────────────

export const formSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: slugSchema.optional(),
  formType: z.string().max(50),
  description: z.string().optional(),
  isActive: z.boolean(),
  successMessage: z.string().optional(),
  createdBy: uuidSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createFormSchema = z.object({
  name: z.string(),
  slug: slugSchema.optional(),
  formType: z.string().max(50),
  description: z.string().optional(),
  isActive: z.boolean(),
  successMessage: z.string().optional(),
  createdBy: uuidSchema,
});

export const updateFormSchema = formSchema.partial();

// ─── Form Fields ─────────────────────────────────────────────────────────────

export const formFieldSchema = z.object({
  id: uuidSchema,
  formId: uuidSchema,
  label: z.string(),
  fieldType: z.enum(["text", "email", "phone", "textarea", "select", "radio", "checkbox", "date", "file", "url", "number"]),
  isRequired: z.boolean(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  options: z.record(z.unknown()).optional(),
  validationRules: z.record(z.unknown()).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const createFormFieldSchema = z.object({
  formId: uuidSchema,
  label: z.string(),
  fieldType: z.enum(["text", "email", "phone", "textarea", "select", "radio", "checkbox", "date", "file", "url", "number"]),
  isRequired: z.boolean(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  options: z.record(z.unknown()).optional(),
  validationRules: z.record(z.unknown()).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateFormFieldSchema = formFieldSchema.partial();

// ─── Form Submissions ────────────────────────────────────────────────────────

export const formSubmissionSchema = z.object({
  id: uuidSchema,
  formId: uuidSchema,
  data: z.record(z.unknown()),
  leadId: uuidSchema.optional(),
  spamScore: z.coerce.number().optional(),
  createdAt: timestampSchema,
});

export const createFormSubmissionSchema = z.object({
  formId: uuidSchema,
  data: z.record(z.unknown()),
  leadId: uuidSchema.optional(),
  spamScore: z.coerce.number().optional(),
});

export const updateFormSubmissionSchema = formSubmissionSchema.partial();

// ─── Form Analytics ──────────────────────────────────────────────────────────

export const formAnalyticSchema = z.object({
  id: uuidSchema,
  formId: uuidSchema,
  date: z.string(),
  views: z.coerce.number().int(),
  starts: z.coerce.number().int(),
  submissions: z.coerce.number().int(),
  abandonments: z.coerce.number().int(),
  conversionRate: z.coerce.number(),
});

export const createFormAnalyticSchema = z.object({
  formId: uuidSchema,
  date: z.string(),
  views: z.coerce.number().int(),
  starts: z.coerce.number().int(),
  submissions: z.coerce.number().int(),
  abandonments: z.coerce.number().int(),
  conversionRate: z.coerce.number(),
});

export const updateFormAnalyticSchema = formAnalyticSchema.partial();
