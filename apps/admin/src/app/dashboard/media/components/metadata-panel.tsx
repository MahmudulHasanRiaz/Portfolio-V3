"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, Button, Input, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@repo/ui";
import { ExternalLink, Trash2, RotateCcw, Link2, Wand2, Copy, Check } from "lucide-react";
import type { MediaItem, FolderNode, MediaUsageRef } from "./media-types";
import { MEDIA_TYPE_LABELS, formatFileSize, getTypeColor, isImageType, flattenFolders, suggestSlug } from "./media-types";
import { ConfirmDialog } from "../../../../components/confirm-dialog";

export interface MediaUpdateData {
  altText?: string;
  folderId?: string | null;
  originalName?: string;
  filename?: string;
  slug?: string;
}

interface Props {
  item: MediaItem | null;
  folders: FolderNode[];
  onClose: () => void;
  onUpdate: (id: string, data: MediaUpdateData) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

export function MetadataPanel({ item, folders, onClose, onUpdate, onDelete, onRestore }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [altText, setAltText] = useState("");
  const [folderId, setFolderId] = useState<string>("none");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [usage, setUsage] = useState<MediaUsageRef[] | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync the form every time a different asset is opened (useState alone
  // would keep the previous asset's values).
  useEffect(() => {
    setDisplayName(item?.originalName || "");
    setSlug(item?.slug || "");
    setAltText(item?.altText || "");
    setFolderId(item?.folderId || "none");
    setError("");
    setUsage(null);
    if (item) {
      setUsageLoading(true);
      fetch(`/api/media/usage/${item.id}`)
        .then((r) => r.json())
        .then((d) => setUsage(d.data || []))
        .catch(() => setUsage([]))
        .finally(() => setUsageLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (!item) return null;

  const isDeleted = !!item.deletedAt;
  const flatFolders = flattenFolders(folders);
  const dirty =
    displayName !== (item.originalName || "") ||
    slug !== (item.slug || "") ||
    altText !== (item.altText || "") ||
    folderId !== (item.folderId || "none");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const result = await onUpdate(item.id, {
      originalName: displayName.trim(),
      slug: slug.trim(),
      altText,
      folderId: folderId === "none" ? null : folderId,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error || "Could not save changes.");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(item.id);
    setDeleting(false);
    onClose();
  };

  const handleRestore = async () => {
    await onRestore(item.id);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — the URL field is selectable as fallback.
    }
  };

  return (
    <>
      <Sheet open={!!item} onOpenChange={() => onClose()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Media Details</SheetTitle>
          </SheetHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>
            {isImageType(item.type) && (
              <div style={{
                borderRadius: 14, overflow: "hidden",
                border: "1px solid var(--border-color)",
              }}>
                <img
                  src={item.variants?.medium_webp || item.variants?.medium_jpeg || item.url}
                  alt={item.altText || item.originalName}
                  style={{ width: "100%", display: "block" }}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>File Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                style={{ marginTop: 4 }}
              />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Stored file: {item.filename} — the stored file is never renamed,
                because content links to its URL.
              </p>
            </div>

            <div>
              <label style={labelStyle}>Slug</label>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="e.g. jannat-erp-hero"
                  style={{ flex: 1 }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  title="Suggest a slug from the file name"
                  onClick={() => setSlug(suggestSlug(displayName || item.originalName))}
                >
                  <Wand2 size={14} />
                </Button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Unique across the library. Leave empty to auto-generate from the file name.
              </p>
            </div>

            <div>
              <label style={labelStyle}>Alt Text</label>
              <Input
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image for accessibility and SEO"
                style={{ marginTop: 4 }}
              />
            </div>

            <div>
              <label style={labelStyle}>Folder</label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger style={{ marginTop: 4 }}>
                  <SelectValue placeholder="No folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {flatFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {"\u00A0\u00A0".repeat(f.depth)}{f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ marginTop: 4 }}>
                <Badge variant="outline" style={{ color: getTypeColor(item.type) }}>
                  {MEDIA_TYPE_LABELS[item.type] || item.type}
                </Badge>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Size</label>
                <p style={{ fontSize: 13, color: "var(--text-primary)" }}>{formatFileSize(item.size)}</p>
              </div>
              {item.width && item.height && (
                <div>
                  <label style={labelStyle}>Dimensions</label>
                  <p style={{ fontSize: 13, color: "var(--text-primary)" }}>{item.width} x {item.height}</p>
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>URL</label>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <Input value={item.url} readOnly style={{ fontSize: 12 }} />
                <Button variant="outline" size="icon" onClick={handleCopyUrl} title="Copy URL">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(item.url, "_blank")}
                  title="Open in a new tab"
                >
                  <ExternalLink size={14} />
                </Button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Used In</label>
              {usageLoading ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Checking where this file is used…</p>
              ) : usage && usage.length > 0 ? (
                <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {usage.map((u) => (
                    <li key={`${u.type}-${u.id}-${u.field}`} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                      <Link2 size={13} style={{ color: "var(--brand)", flexShrink: 0 }} />
                      <a href={u.url} style={{ color: "var(--brand)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.type}: {u.title}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  Not attached to any content yet — safe to delete.
                </p>
              )}
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "var(--accent-danger)", margin: 0 }}>{error}</p>
            )}

            <div style={{
              display: "flex", gap: 8, paddingTop: 8,
              borderTop: "1px solid var(--border-color)",
            }}>
              <Button onClick={handleSave} disabled={saving || !dirty} style={{ flex: 1 }}>
                {saving ? "Saving..." : "Save"}
              </Button>
              {isDeleted ? (
                <Button variant="outline" onClick={handleRestore}>
                  <RotateCcw size={14} style={{ marginRight: 6 }} />Restore
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setConfirmDeleteOpen(true)} disabled={deleting} style={{ color: "var(--accent-danger)" }}>
                  <Trash2 size={14} style={{ marginRight: 6 }} />{deleting ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete media?"
        message={`"${item.originalName}" will be moved to trash. You can restore it later. Any content using this file will lose its image.`}
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        busyLabel="Deleting…"
        onConfirm={handleDelete}
      />
    </>
  );
}
