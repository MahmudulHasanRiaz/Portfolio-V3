export interface MediaUsageRef {
  type: string;
  id: string;
  title?: string;
  field: string;
  url: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
  altText?: string;
  slug?: string;
  folderId?: string;
  variants?: Record<string, string>;
  uploadedBy: string;
  createdAt: Date | null;
  deletedAt: Date | null;
  url: string;
  /** Real attachment count, computed from content rows (0 when unattached). */
  attachedCount?: number;
  /** First few usages; see /api/media/usage/[id] for the full list. */
  attachedTo?: MediaUsageRef[];
}

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  children: FolderNode[];
  assetCount?: number;
}

export const MEDIA_TYPE_LABELS: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "image/gif": "GIF",
  "image/svg+xml": "SVG",
  "application/pdf": "PDF",
  "video/mp4": "MP4",
  "video/webm": "WebM",
  "audio/mpeg": "MP3",
};

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getTypeColor(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "var(--accent-info)";
  if (mimeType.startsWith("video/")) return "var(--accent-warning)";
  if (mimeType.startsWith("audio/")) return "var(--accent-success)";
  return "var(--text-muted)";
}

export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith("image/") && mimeType !== "image/svg+xml";
}

/** Flatten a nested folder tree for <select> options. */
export function flattenFolders(nodes: FolderNode[], depth = 0): Array<{ id: string; name: string; depth: number }> {
  const out: Array<{ id: string; name: string; depth: number }> = [];
  for (const node of nodes) {
    out.push({ id: node.id, name: node.name, depth });
    out.push(...flattenFolders(node.children, depth + 1));
  }
  return out;
}

/** Slug suggestion from a display name (mirrors the server slugify). */
export function suggestSlug(name: string): string {
  return name
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}
