import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

// ─── SEO Meta ────────────────────────────────────────────────────────────────

export const seoMetaSchema = z.object({
  id: uuidSchema,
  entityType: z.string().max(50),
  entityId: uuidSchema,
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
  keywords: z.string().optional(),
  indexable: z.boolean().optional(),
  followLinks: z.boolean().optional(),
  noArchive: z.boolean().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createSeoMetaSchema = z.object({
  entityType: z.string().max(50),
  entityId: uuidSchema,
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
  keywords: z.string().optional(),
  indexable: z.boolean().optional(),
  followLinks: z.boolean().optional(),
  noArchive: z.boolean().optional(),
});

export const updateSeoMetaSchema = seoMetaSchema.partial();

// ─── Slug Redirects ──────────────────────────────────────────────────────────

export const slugRedirectSchema = z.object({
  id: uuidSchema,
  sourceSlug: z.string().max(255),
  destinationUrl: z.string(),
  redirectType: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]),
  entityType: z.string().max(50).optional(),
  isActive: z.boolean(),
  createdAt: timestampSchema,
});

export const createSlugRedirectSchema = z.object({
  sourceSlug: z.string().max(255),
  destinationUrl: z.string(),
  redirectType: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]),
  entityType: z.string().max(50).optional(),
  isActive: z.boolean(),
});

export const updateSlugRedirectSchema = slugRedirectSchema.partial();
