import { z } from "zod";
import { uuidSchema, timestampSchema, slugSchema } from "./common";

// ─── Releases ────────────────────────────────────────────────────────────────

export const releaseSchema = z.object({
  id: uuidSchema,
  title: z.string().optional(),
  titleBn: z.string().optional(),
  slug: slugSchema.optional(),
  type: z.enum(["nasheed", "tilawat", "acting", "podcast", "interview", "documentary"]).optional(),
  coverImage: z.string().optional(),
  description: z.string().optional(),
  descriptionBn: z.string().optional(),
  releaseFormat: z.string().max(50).optional(),
  releaseDate: z.string().optional(),
  isFeatured: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
  keywords: z.string().optional(),
  lyrics: z.string().optional(),
  credits: z.record(z.string(), z.unknown()).optional(),
  createdBy: uuidSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createReleaseSchema = z.object({
  title: z.string().optional(),
  titleBn: z.string().optional(),
  slug: slugSchema.optional(),
  type: z.enum(["nasheed", "tilawat", "acting", "podcast", "interview", "documentary"]).optional(),
  coverImage: z.string().optional(),
  description: z.string().optional(),
  descriptionBn: z.string().optional(),
  releaseFormat: z.string().max(50).optional(),
  releaseDate: z.string().optional(),
  isFeatured: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
  keywords: z.string().optional(),
  lyrics: z.string().optional(),
  credits: z.record(z.string(), z.unknown()).optional(),
  createdBy: uuidSchema.optional(),
});

export const updateReleaseSchema = releaseSchema.partial();

// ─── Release Platforms ───────────────────────────────────────────────────────

export const releasePlatformSchema = z.object({
  id: uuidSchema,
  releaseId: uuidSchema,
  platformName: z.string().max(100),
  platformUrl: z.string().optional(),
});

export const createReleasePlatformSchema = z.object({
  releaseId: uuidSchema,
  platformName: z.string().max(100),
  platformUrl: z.string().optional(),
});

export const updateReleasePlatformSchema = releasePlatformSchema.partial();

// ─── Release Lyrics ──────────────────────────────────────────────────────────

export const releaseLyricSchema = z.object({
  id: uuidSchema,
  releaseId: uuidSchema,
  lyricsText: z.string().optional(),
  lyricsLanguage: z.string().max(10).optional(),
  translations: z.record(z.string(), z.unknown()).optional(),
});

export const createReleaseLyricSchema = z.object({
  releaseId: uuidSchema,
  lyricsText: z.string().optional(),
  lyricsLanguage: z.string().max(10).optional(),
  translations: z.record(z.string(), z.unknown()).optional(),
});

export const updateReleaseLyricSchema = releaseLyricSchema.partial();

// ─── Release Videos ──────────────────────────────────────────────────────────

export const createReleaseVideoSchema = z.object({
  platformName: z.string().max(100).optional(),
  videoUrl: z.string().optional(),
  title: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateReleaseVideoSchema = createReleaseVideoSchema.partial();
