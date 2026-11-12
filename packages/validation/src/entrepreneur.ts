import { z } from "zod";
import { uuidSchema, timestampSchema, slugSchema } from "./common";

// ─── Ventures ────────────────────────────────────────────────────────────────

export const ventureSchema = z.object({
  id: uuidSchema,
  name: z.string().optional(),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  website: z.string().optional(),
  foundedDate: z.string().optional(),
  foundedYear: z.coerce.number().int().min(1900).max(2100).optional(),
  status: z.enum(["active", "paused", "acquired", "closed"]).optional(),
  isFeatured: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
  keywords: z.string().optional(),
  createdBy: uuidSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createVentureSchema = z.object({
  name: z.string().optional(),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  website: z.string().optional(),
  foundedDate: z.string().optional(),
  foundedYear: z.coerce.number().int().min(1900).max(2100).optional(),
  status: z.enum(["active", "paused", "acquired", "closed"]).optional(),
  isFeatured: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
  keywords: z.string().optional(),
  createdBy: uuidSchema.optional(),
});

export const updateVentureSchema = ventureSchema.partial();

// ─── Products ────────────────────────────────────────────────────────────────

export const productSchema = z.object({
  id: uuidSchema,
  ventureId: uuidSchema,
  name: z.string().optional(),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  launchDate: z.string().optional(),
  url: z.string().optional(),
  status: z.enum(["active", "deprecated"]).optional(),
  isFeatured: z.boolean().optional(),
  createdBy: uuidSchema.optional(),
  createdAt: timestampSchema,
});

export const createProductSchema = z.object({
  ventureId: uuidSchema,
  name: z.string().optional(),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  launchDate: z.string().optional(),
  url: z.string().optional(),
  status: z.enum(["active", "deprecated"]).optional(),
  isFeatured: z.boolean().optional(),
  createdBy: uuidSchema.optional(),
});

export const updateProductSchema = productSchema.partial();

// ─── Venture Products (junction) ─────────────────────────────────────────────

export const ventureProductSchema = z.object({
  ventureId: uuidSchema,
  productId: uuidSchema,
});

export const createVentureProductSchema = ventureProductSchema;
export const updateVentureProductSchema = ventureProductSchema.partial();
