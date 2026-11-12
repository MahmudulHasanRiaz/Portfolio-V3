import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

// ─── Media Assets ────────────────────────────────────────────────────────────

export const mediaAssetSchema = z.object({
  id: uuidSchema,
  filename: z.string(),
  originalName: z.string(),
  path: z.string(),
  type: z.string().max(50),
  size: z.coerce.number().int(),
  width: z.coerce.number().int().optional(),
  height: z.coerce.number().int().optional(),
  altText: z.string().optional(),
  folderId: uuidSchema.optional(),
  variants: z.record(z.unknown()).optional(),
  uploadedBy: uuidSchema,
  createdAt: timestampSchema,
  deletedAt: timestampSchema.optional(),
});

export const createMediaAssetSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  path: z.string(),
  type: z.string().max(50),
  size: z.coerce.number().int(),
  width: z.coerce.number().int().optional(),
  height: z.coerce.number().int().optional(),
  altText: z.string().optional(),
  folderId: uuidSchema.optional(),
  variants: z.record(z.unknown()).optional(),
  uploadedBy: uuidSchema,
});

export const updateMediaAssetSchema = mediaAssetSchema.partial();

// ─── Media Folders ───────────────────────────────────────────────────────────

export const mediaFolderSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  parentId: uuidSchema.optional(),
  path: z.string(),
  createdAt: timestampSchema,
});

export const createMediaFolderSchema = z.object({
  name: z.string(),
  parentId: uuidSchema.optional(),
  path: z.string(),
});

export const updateMediaFolderSchema = mediaFolderSchema.partial();
