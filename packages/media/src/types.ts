import type { VariantName, MediaCategory } from "./config";

export interface UploadOptions {
  folder?: string;
  folderId?: string;
  generateVariants?: boolean;
  altText?: string;
  metadata?: Record<string, string>;
}

export interface VariantResult {
  name: VariantName;
  format: string;
  width: number;
  height: number;
  size: number;
  key: string;
  url: string;
}

export interface UploadResult {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  type: string;
  category: MediaCategory;
  size: number;
  width?: number;
  height?: number;
  variants?: Record<string, string>;
  url: string;
  slug?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  mimeType?: string;
  extension?: string;
  category?: MediaCategory;
}

export interface VariantConfig {
  width: number;
  height?: number;
  fit: "cover" | "inside" | "outside" | "contain" | "fill";
}

export interface ImageProcessorOptions {
  quality?: number;
  formats?: string[];
  variants?: Partial<Record<VariantName, VariantConfig>>;
}

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface MediaSearchParams {
  query?: string;
  type?: string;
  category?: string;
  folderId?: string;
  mimeType?: string;
  uploadedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
  /** When set, only assets attached / not attached to any content are returned. */
  attached?: boolean;
  /** When true, each item also carries attachedCount + attachedTo (usage). */
  includeUsage?: boolean;
}

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  children: FolderNode[];
  assetCount?: number;
}

export interface MediaUsage {
  type: string;
  id: string;
  title?: string;
  field: string;
  url: string;
}
