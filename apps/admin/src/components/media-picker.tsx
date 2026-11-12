"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Button, Input,
} from "@repo/ui";
import {
  Search, Image as ImageIcon, Video as VideoIcon, FileText,
  Upload, Check, FolderOpen, X, Loader2,
} from "lucide-react";

/**
 * Shared Media Picker — the ONE way to attach media (image / video) from
 * any dashboard form. Browse/search the Media Library, preview an item,
 * select it in one flow; or upload a new file without leaving the form.
 * The picker only fills the form field with the asset URL — it never
 * changes what a form saves.
 *
 * Usage:
 *   const [pickerOpen, setPickerOpen] = useState(false);
 *   <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
 *     Choose from library
 *   </Button>
 *   <MediaPicker open={pickerOpen} onOpenChange={setPickerOpen} type="image"
 *     onSelect={(url) => setField(url)} />
 */

export interface MediaPickerAsset {
  id: string;
  filename: string;
  originalName: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
  altText?: string;
  folderId?: string;
  variants?: Record<string, string>;
  url: string;
}

export type MediaPickerType = "image" | "video" | "all";

export interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the asset URL (the value the form saves) + the asset. */
  onSelect: (url: string, asset: MediaPickerAsset) => void;
  /** Which assets the picker shows. Defaults to "image". */
  type?: MediaPickerType;
  title?: string;
  /** Folder name new uploads from the picker are stored in. */
  uploadFolder?: string;
}

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderNode[];
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isVideo(asset: MediaPickerAsset): boolean {
  return asset.type.startsWith("video/");
}

function isImage(asset: MediaPickerAsset): boolean {
  return asset.type.startsWith("image/");
}

function thumbUrl(asset: MediaPickerAsset): string {
  return asset.variants?.thumbnail_webp || asset.variants?.thumbnail_jpeg || asset.url;
}

/** Flatten the folder tree for a <select>, keeping hierarchy visible. */
function flattenFolders(nodes: FolderNode[], depth = 0): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const n of nodes) {
    out.push({ id: n.id, label: `${"— ".repeat(depth)}${n.name}` });
    if (n.children?.length) out.push(...flattenFolders(n.children, depth + 1));
  }
  return out;
}

const TYPE_LABEL: Record<MediaPickerType, string> = {
  image: "Images",
  video: "Videos",
  all: "All media",
};

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  type = "image",
  title,
  uploadFolder,
}: MediaPickerProps) {
  const [tab, setTab] = useState<"browse" | "upload">("browse");
  const [items, setItems] = useState<MediaPickerAsset[]>([]);
  const [folders, setFolders] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [folderId, setFolderId] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">(
    type === "all" ? "all" : type,
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<MediaPickerAsset | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce the search query so typing does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => { setPage(1); }, [debouncedQuery, folderId, typeFilter]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: "24" });
      if (debouncedQuery) params.set("query", debouncedQuery);
      if (folderId) params.set("folderId", folderId);
      const effectiveType = type === "all" ? typeFilter : type;
      if (effectiveType !== "all") params.set("type", `${effectiveType}/`);
      const res = await fetch(`/api/media?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load media");
      setItems((data.items || []) as MediaPickerAsset[]);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQuery, folderId, typeFilter, type]);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/media/folders");
      const data = await res.json();
      const tree = (data.data || []) as FolderNode[];
      setFolders(flattenFolders(tree));
    } catch {
      setFolders([]);
    }
  }, []);

  // (Re)load whenever the picker opens or a filter changes.
  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setTab("browse");
    fetchFolders();
    fetchItems();
  }, [open, fetchItems, fetchFolders]);

  const handleSelect = (asset: MediaPickerAsset) => {
    onSelect(asset.url, asset);
    onOpenChange(false);
  };

  const accept = type === "video" ? "video/*" : type === "image" ? "image/*" : "image/*,video/*,.pdf";

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      if (uploadFolder) form.append("folder", uploadFolder);
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const url = data?.data?.url as string | undefined;
      if (!url) throw new Error("Upload did not return a URL");
      const asset: MediaPickerAsset = {
        id: (data.data.id as string) || "",
        filename: (data.data.filename as string) || uploadFile.name,
        originalName: (data.data.originalName as string) || uploadFile.name,
        type: (data.data.type as string) || uploadFile.type,
        size: (data.data.size as number) || uploadFile.size,
        width: data.data.width as number | undefined,
        height: data.data.height as number | undefined,
        variants: data.data.variants as Record<string, string> | undefined,
        url,
      };
      onSelect(url, asset);
      onOpenChange(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const dialogTitle = title || `Choose ${TYPE_LABEL[type].toLowerCase()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto sm:max-w-3xl max-sm:bottom-0 max-sm:left-1/2 max-sm:top-auto max-sm:w-[calc(100vw-12px)] max-sm:translate-x-[-50%] max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Pick from the media library, or upload a new file — the selected
            file fills the form field, no leaving the form.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs: Browse library (main) / Upload new (secondary) */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {(
            [
              { id: "browse", label: "Browse library" },
              { id: "upload", label: "Upload new" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 14px",
                fontSize: 14,
                fontWeight: tab === t.id ? 600 : 500,
                color: tab === t.id ? "var(--brand)" : "var(--text-muted)",
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? "2px solid var(--brand)" : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "browse" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Search + folder + type filters (wrap on mobile) */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute", left: 12, top: "50%",
                    transform: "translateY(-50%)", color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name…"
                  style={{ paddingLeft: 36 }}
                />
              </div>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                aria-label="Filter by folder"
                style={{
                  flex: "0 1 180px",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                }}
              >
                <option value="">All folders</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
              {type === "all" && (
                <div style={{ display: "flex", gap: 4 }} role="group" aria-label="Filter by type">
                  {(["all", "image", "video"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTypeFilter(t)}
                      style={{
                        padding: "8px 12px",
                        fontSize: 13,
                        fontWeight: 500,
                        borderRadius: 999,
                        border: `1px solid ${typeFilter === t ? "var(--brand)" : "var(--border)"}`,
                        background: typeFilter === t ? "var(--brand-50, #e2f2ee)" : "var(--surface)",
                        color: typeFilter === t ? "var(--brand)" : "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      {t === "all" ? "All" : t === "image" ? "Images" : "Videos"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grid */}
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 40, color: "var(--text-muted)" }}>
                <Loader2 size={18} className="animate-spin" />
                Loading media…
              </div>
            ) : error ? (
              <p style={{ textAlign: "center", color: "var(--destructive)", padding: 32 }}>{error}</p>
            ) : items.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>
                <FolderOpen size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No media found</p>
                <p style={{ fontSize: 13, margin: "4px 0 0" }}>
                  Try a different search, folder, or upload a new file.
                </p>
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))",
                gap: 8,
                maxHeight: 320,
                overflow: "auto",
                padding: 2,
              }}>
                {items.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelected(item)}
                      onDoubleClick={() => handleSelect(item)}
                      title={item.originalName}
                      style={{
                        position: "relative",
                        border: `2px solid ${active ? "var(--brand)" : "var(--border)"}`,
                        borderRadius: 8,
                        overflow: "hidden",
                        cursor: "pointer",
                        padding: 0,
                        background: "var(--surface-2)",
                        aspectRatio: "1",
                      }}
                    >
                      {isImage(item) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={thumbUrl(item)}
                          alt={item.altText || item.originalName}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          loading="lazy"
                        />
                      ) : isVideo(item) ? (
                        <>
                          <video
                            src={item.url}
                            muted
                            playsInline
                            preload="metadata"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                          <span style={{
                            position: "absolute", inset: 0, display: "flex",
                            alignItems: "center", justifyContent: "center",
                            color: "#fff", background: "rgba(0,0,0,0.25)",
                            pointerEvents: "none",
                          }}>
                            <VideoIcon size={22} />
                          </span>
                        </>
                      ) : (
                        <span style={{
                          width: "100%", height: "100%", display: "flex",
                          flexDirection: "column", alignItems: "center", justifyContent: "center",
                          gap: 4, color: "var(--text-muted)", fontSize: 11, padding: 6,
                        }}>
                          <FileText size={22} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                            {item.originalName}
                          </span>
                        </span>
                      )}
                      {active && (
                        <span style={{
                          position: "absolute", top: 6, right: 6, width: 22, height: 22,
                          borderRadius: "50%", background: "var(--brand)", color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Check size={13} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Preview + select */}
            {selected && (
              <div style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                border: "1px solid var(--border)", borderRadius: 10,
                padding: 12, background: "var(--surface-2)",
              }}>
                <div style={{
                  width: 96, height: 96, flexShrink: 0, borderRadius: 8,
                  overflow: "hidden", background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}>
                  {isImage(selected) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={thumbUrl(selected)}
                      alt={selected.altText || selected.originalName}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : isVideo(selected) ? (
                    <video
                      src={selected.url}
                      controls
                      muted
                      playsInline
                      preload="metadata"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                      <FileText size={28} />
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {selected.originalName}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                    {selected.type}
                    {selected.width && selected.height ? ` · ${selected.width}×${selected.height}` : ""}
                    {` · ${formatFileSize(selected.size)}`}
                  </p>
                  {selected.altText && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                      Alt: {selected.altText}
                    </p>
                  )}
                </div>
                <Button onClick={() => handleSelect(selected)} style={{ flexShrink: 0 }}>
                  Select
                </Button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) setUploadFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "var(--brand)" : "var(--border)"}`,
                borderRadius: 12,
                padding: 32,
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "var(--brand-50, #e2f2ee)" : "transparent",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }}
                style={{ display: "none" }}
              />
              <Upload size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 4px" }}>
                Drop a file here or click to browse
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                {type === "video" ? "Video files" : type === "image" ? "Images (JPEG, PNG, WebP, AVIF, GIF, SVG)" : "Images, videos or PDF"}
                {uploadFolder ? ` · saved to “${uploadFolder}”` : ""}
              </p>
              {type !== "video" && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0" }}>
                  Recommended: WebP/AVIF preferred (JPEG/PNG ok), max 10 MB, quality 75–80 — don&apos;t compress
                  aggressively. Upload close to the display size; oversized files only waste bandwidth. No manual
                  resizing needed — images are automatically optimized for the public site.
                </p>
              )}
            </div>

            {uploadFile && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 8,
                background: "var(--surface-2)", fontSize: 13, color: "var(--text-primary)",
              }}>
                {uploadFile.type.startsWith("video/") ? (
                  <VideoIcon size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                ) : (
                  <ImageIcon size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                )}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {uploadFile.name}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
                  {formatFileSize(uploadFile.size)}
                </span>
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => setUploadFile(null)}
                    aria-label="Remove file"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text-muted)" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {uploadError && (
              <p style={{ margin: 0, fontSize: 13, color: "var(--destructive)" }}>{uploadError}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
                {uploading ? "Uploading…" : "Upload & select"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
