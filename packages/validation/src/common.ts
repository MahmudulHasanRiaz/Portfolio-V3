import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const slugSchema = z.string().min(1).max(255).regex(/^[a-z0-9-]+$/);

export const entityStatusSchema = z.enum(["draft", "published", "archived"]);

export const timestampSchema = z.string().datetime();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

export function apiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
    error: z.string().optional(),
  });
}

export const seoSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().url().optional(),
  canonicalUrl: z.string().url().optional(),
  keywords: z.string().optional(),
  indexable: z.boolean().optional(),
  followLinks: z.boolean().optional(),
});
