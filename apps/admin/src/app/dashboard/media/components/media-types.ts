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

/** One folder's files inside a recursive folder view (a folder open in
 *  the Media Library shows its own files plus every subfolder's, grouped
 *  by folder). `label` is the folder's full display path. */
export interface MediaItemGroup {
  key: string;
  label: string;
  items: MediaItem[];
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

export interface FlatFolder {
  id: string;
  name: string;
  depth: number;
  /** Full "Parent / Child" path from the root — what a long folder list
   *  and the parent picker show, so a nested folder is never ambiguous. */
  displayPath: string;
}

/** Flatten a nested folder tree for <select> options. */
export function flattenFolders(nodes: FolderNode[], depth = 0, parentPath = ""): FlatFolder[] {
  const out: FlatFolder[] = [];
  for (const node of nodes) {
    const displayPath = parentPath ? `${parentPath} / ${node.name}` : node.name;
    out.push({ id: node.id, name: node.name, depth, displayPath });
    out.push(...flattenFolders(node.children, depth + 1, displayPath));
  }
  return out;
}

/** Ancestor chain from the root down to the folder with `id` (inclusive),
 *  or null when the id is not in the tree. Used for the breadcrumb and
 *  for auto-expanding the path to the selected folder. */
export function findFolderPath(nodes: FolderNode[], id: string): FolderNode[] | null {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const childPath = findFolderPath(node.children, id);
    if (childPath) return [node, ...childPath];
  }
  return null;
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
