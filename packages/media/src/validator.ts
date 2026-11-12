import { MEDIA_CONFIG, type MediaCategory } from "./config";
import type { ValidationResult } from "./types";
import path from "path";

export function validateFile(
  fileName: string,
  mimeType: string,
  fileSize: number,
): ValidationResult {
  const errors: string[] = [];

  if (!fileName || !mimeType) {
    return { valid: false, errors: ["File name and MIME type are required."], mimeType, extension: undefined, category: undefined };
  }

  const ext = path.extname(fileName).toLowerCase();

  const allowedMimes = MEDIA_CONFIG.allowedMimeTypes;
  if (!allowedMimes.includes(mimeType)) {
    errors.push(`MIME type "${mimeType}" is not allowed.`);
  }

  const allowedExts = MEDIA_CONFIG.allowedExtensions[mimeType];
  if (allowedExts && !allowedExts.includes(ext)) {
    errors.push(`File extension "${ext}" does not match MIME type "${mimeType}".`);
  }

  const category = MEDIA_CONFIG.mimeCategory[mimeType] as MediaCategory | undefined;
  if (!category) {
    errors.push(`Unsupported MIME type "${mimeType}".`);
  }

  if (category) {
    const limit = MEDIA_CONFIG.sizeLimits[category] ?? 0;
    if (limit > 0 && fileSize > limit) {
      const limitMB = limit / (1024 * 1024);
      errors.push(`File size exceeds ${limitMB}MB limit for ${category} files.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    mimeType,
    extension: ext,
    category,
  };
}

export function validateImageDimensions(
  width: number,
  height: number,
): string[] {
  const errors: string[] = [];
  if (width <= 0 || height <= 0) {
    errors.push("Image dimensions must be positive.");
  }
  if (width > 10000 || height > 10000) {
    errors.push("Image dimensions exceed maximum (10000x10000).");
  }
  return errors;
}

export function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  const sanitized = name
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    || "unnamed";
  const timestamp = Date.now();
  return `${sanitized}-${timestamp}${ext}`;
}

export function detectMimeType(_fileName: string, buffer: Buffer): string | null {
  const magicBytes: Array<{ offset: number; bytes: number[]; mime: string }> = [
    { offset: 0, bytes: [0xFF, 0xD8, 0xFF], mime: "image/jpeg" },
    { offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47], mime: "image/png" },
    { offset: 0, bytes: [0x47, 0x49, 0x46], mime: "image/gif" },
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" },
    { offset: 0, bytes: [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], mime: "image/avif" },
    { offset: 0, bytes: [0x3C, 0x3F, 0x78, 0x6D, 0x6C], mime: "image/svg+xml" },
    { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46], mime: "application/pdf" },
    { offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04], mime: "application/zip" },
  ];

  for (const sig of magicBytes) {
    const matches = sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte);
    if (matches) return sig.mime;
  }

  return null;
}

/**
 * URL-friendly slug from a file/display name, e.g. "Jannat ERP Hero.jpg" ->
 * "jannat-erp-hero". Strips the extension, lowercases, collapses every run
 * of non-alphanumerics to a single "-". Returns "" when nothing usable
 * remains (callers fall back to a generated value).
 */
export function slugify(value: string): string {
  const base = value.replace(/\.[a-zA-Z0-9]+$/, "");
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 255;
}
