import { z } from "zod";
import { uuidSchema, timestampSchema, slugSchema } from "./common";

// ─── Ventures ────────────────────────────────────────────────────────────────

export const ventureSchema = z.object({
  id: uuidSchema,
  name: z.string().optional(),
  nameBn: z.string().optional(),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  descriptionBn: z.string().optional(),
  contentStatus: z.enum(["draft", "published", "archived"]).optional(),
  coverImage: z.string().optional(),
  socialLinks: z.record(z.string(), z.unknown()).optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
  thumbnailType: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  thumbnailVideoUrl: z.string().optional(),
  thumbnailAutoplay: z.boolean().optional(),
  videos: z.array(z.string()).optional(),
  galleryImages: z.array(z.string()).optional(),
  teamSize: z.coerce.number().int().optional(),
  industry: z.string().optional(),
  stage: z.string().optional(),
  location: z.string().optional(),
  shortDescription: z.string().optional(),
  shortDescriptionBn: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isPreview: z.boolean().optional(),
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
  nameBn: z.string().optional(),
  slug: slugSchema.optional(),
  description: z.string().optional(),
  descriptionBn: z.string().optional(),
  contentStatus: z.enum(["draft", "published", "archived"]).optional(),
  coverImage: z.string().optional(),
  socialLinks: z.record(z.string(), z.unknown()).optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
  thumbnailType: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  thumbnailVideoUrl: z.string().optional(),
  thumbnailAutoplay: z.boolean().optional(),
  videos: z.array(z.string()).optional(),
  galleryImages: z.array(z.string()).optional(),
  teamSize: z.coerce.number().int().optional(),
  industry: z.string().optional(),
  stage: z.string().optional(),
  location: z.string().optional(),
  shortDescription: z.string().optional(),
  shortDescriptionBn: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isPreview: z.boolean().optional(),
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
