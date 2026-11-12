import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

// ─── Search Index ────────────────────────────────────────────────────────────

export const searchIndexSchema = z.object({
  id: uuidSchema,
  entityType: z.string().max(50),
  entityId: uuidSchema,
  title: z.string(),
  content: z.string(),
  summary: z.string().optional(),
  url: z.string().optional(),
  thumbnail: z.string().optional(),
  publishedAt: timestampSchema.optional(),
  contentType: z.string().max(50).optional(),
  locale: z.string().max(10).optional(),
});

export const createSearchIndexSchema = z.object({
  entityType: z.string().max(50),
  entityId: uuidSchema,
  title: z.string(),
  content: z.string(),
  summary: z.string().optional(),
  url: z.string().optional(),
  thumbnail: z.string().optional(),
  publishedAt: timestampSchema.optional(),
  contentType: z.string().max(50).optional(),
  locale: z.string().max(10).optional(),
});

export const updateSearchIndexSchema = searchIndexSchema.partial();

// ─── Search Synonyms ─────────────────────────────────────────────────────────

export const searchSynonymSchema = z.object({
  id: uuidSchema,
  term: z.string().max(255),
  synonyms: z.array(z.string()),
});

export const createSearchSynonymSchema = z.object({
  term: z.string().max(255),
  synonyms: z.array(z.string()),
});

export const updateSearchSynonymSchema = searchSynonymSchema.partial();
