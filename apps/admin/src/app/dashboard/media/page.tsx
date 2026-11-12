"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@repo/ui";
import { Upload, FolderPlus } from "lucide-react";
import { MediaGrid } from "./components/media-grid";
import { FolderTree } from "./components/folder-tree";
import { UploadDialog } from "./components/upload-dialog";
import { MetadataPanel, type MediaUpdateData } from "./components/metadata-panel";
import { MediaSearch } from "./components/media-search";
import { SelectionToolbar } from "./components/selection-toolbar";
import { flattenFolders } from "./components/media-types";
import type { MediaItem, FolderNode } from "./components/media-types";
import { ConfirmDialog, PromptDialog } from "../../../components/confirm-dialog";

type SortKey = "newest" | "oldest" | "name-asc" | "name-desc" | "size-desc" | "size-asc";

const SORT_PARAMS: Record<SortKey, { sortBy: string; sortDir: "asc" | "desc" }> = {
  newest: { sortBy: "date", sortDir: "desc" },
  oldest: { sortBy: "date", sortDir: "asc" },
  "name-asc": { sortBy: "name", sortDir: "asc" },
  "name-desc": { sortBy: "name", sortDir: "desc" },
  "size-desc": { sortBy: "size", sortDir: "desc" },
  "size-asc": { sortBy: "size", sortDir: "asc" },
};

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState("all");
  const [attachedFilter, setAttachedFilter] = useState("all");
  const [showTrash, setShowTrash] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [isMobile, setIsMobile] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // In-app dialogs only — no native browser dialogs anywhere on this page.
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | undefined>(undefined);
  const [renameFolder, setRenameFolder] = useState<FolderNode | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderNode | null>(null);
  const [folderError, setFolderError] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "30",
        includeUsage: "true",
      });
      if (searchQuery) params.set("query", searchQuery);
      if (selectedFolderId) params.set("folderId", selectedFolderId);
      if (filterType && filterType !== "all") params.set("type", filterType);
      if (attachedFilter === "attached") params.set("attached", "true");
      if (attachedFilter === "unattached") params.set("attached", "false");
      // Trash (Recovery Queue): the list API has no deleted-only mode, so
      // fetch with deleted included and keep only trashed rows client-side.
      // Without this toggle, trashed files were unreachable — the detail
      // panel's Restore button could never be opened.
      if (showTrash) params.set("includeDeleted", "true");
      const sort = SORT_PARAMS[sortKey];
      params.set("sortBy", sort.sortBy);
      params.set("sortDir", sort.sortDir);

      const res = await fetch(`/api/media?${params}`);
      const data = await res.json();
      const allItems = (data.items || []) as MediaItem[];
      const visible = showTrash ? allItems.filter((i) => i.deletedAt) : allItems;
      setItems(visible);
      // In trash mode the server totals cover non-deleted files too, so
      // report only what is actually shown (single page).
      setTotalPages(showTrash ? 1 : data.pagination?.totalPages || 1);
      setTotal(showTrash ? visible.length : data.pagination?.total || 0);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [page, searchQuery, selectedFolderId, filterType, attachedFilter, sortKey, showTrash]);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/media/folders");
      const data = await res.json();
      setFolders(data.data || []);
    } catch {
      setFolders([]);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchFolders(); }, [fetchFolders]);
  useEffect(() => { setPage(1); }, [searchQuery, selectedFolderId, filterType, attachedFilter, sortKey, showTrash]);

  // Bulk download: fetch each file as a blob so the browser saves it with
  // its real name; if the file host refuses the fetch (CORS), fall back to
  // opening the URL in a new tab. Previously this button was a no-op.
  const handleBulkDownload = useCallback(async () => {
    const selected = items.filter((item) => selectedIds.has(item.id));
    for (const item of selected) {
      try {
        // Same-origin proxy: files.riaz.com.bd sends no CORS headers, so a
        // direct cross-origin fetch(item.url) is blocked and the old code
        // fell back to window.open() — which just opened the file in a new
        // tab instead of downloading it. /api/media/[id]/download fetches
        // the file server-side and streams it back as an attachment.
        const res = await fetch(`/api/media/${item.id}/download`);
        if (!res.ok) throw new Error("download failed");
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = item.originalName || item.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      } catch {
        window.open(item.url, "_blank");
      }
      // Stagger so the browser does not block the batch as popups.
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }, [items, selectedIds]);

  const handleSelect = useCallback((id: string, _shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleUpdate = useCallback(async (id: string, data: MediaUpdateData) => {
    const res = await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      fetchItems();
      return { ok: true as const };
    }
    let error = "Could not save changes.";
    try {
      const body = await res.json();
      if (body.error) error = body.error;
    } catch {
      // Keep the default message.
    }
    return { ok: false as const, error };
  }, [fetchItems]);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      fetchItems();
    }
  }, [fetchItems]);

  const handleRestore = useCallback(async (id: string) => {
    const res = await fetch(`/api/media/${id}/restore`, { method: "POST" });
    if (res.ok) {
      fetchItems();
    }
  }, [fetchItems]);

  const handleBulkDelete = useCallback(async () => {
    setBulkDeleting(true);
    for (const id of selectedIds) {
      await fetch(`/api/media/${id}`, { method: "DELETE" });
    }
    setBulkDeleting(false);
    setSelectedIds(new Set());
    fetchItems();
  }, [selectedIds, fetchItems]);

  const handleCreateFolder = useCallback(async (name: string, parentId?: string) => {
    setFolderError("");
    const res = await fetch("/api/media/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });
    if (res.ok) {
      fetchFolders();
    } else {
      setFolderError("Could not create folder.");
    }
  }, [fetchFolders]);

  const handleRenameFolder = useCallback(async (name: string) => {
    if (!renameFolder) return;
    const res = await fetch(`/api/media/folders/${renameFolder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) fetchFolders();
    else setFolderError("Could not rename folder.");
  }, [renameFolder, fetchFolders]);

  const handleDeleteFolder = useCallback(async () => {
    if (!deleteFolder) return;
    const res = await fetch(`/api/media/folders/${deleteFolder.id}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedFolderId === deleteFolder.id) setSelectedFolderId(null);
      fetchFolders();
    } else {
      let message = "Could not delete folder.";
      try {
        const body = await res.json();
        if (body.error) message = body.error;
      } catch {
        // Keep the default message.
      }
      setFolderError(message);
    }
  }, [deleteFolder, selectedFolderId, fetchFolders]);

  const flatFolders = flattenFolders(folders);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Media Library</h1>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload size={16} style={{ marginRight: 6 }} />Upload
        </Button>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {!isMobile && (
          <div style={{ width: 220, flexShrink: 0, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: "4px 8px 8px" }}>
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={(parentId) => { setNewFolderParentId(parentId); setNewFolderOpen(true); }}
              onRenameFolder={setRenameFolder}
              onDeleteFolder={setDeleteFolder}
            />
            {folderError && (
              <p style={{ fontSize: 12, color: "var(--accent-danger)", padding: "4px 8px", margin: 0 }}>{folderError}</p>
            )}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
            <MediaSearch value={searchQuery} onChange={setSearchQuery} />
            {isMobile && (
              <Select value={selectedFolderId || "all"} onValueChange={(v) => setSelectedFolderId(v === "all" ? null : v)}>
                <SelectTrigger style={{ width: 150 }}>
                  <SelectValue placeholder="All folders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All folders</SelectItem>
                  {flatFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {"\u00A0\u00A0".repeat(f.depth)}{f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger style={{ width: 140 }}>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="image/">Images</SelectItem>
                <SelectItem value="video/">Video</SelectItem>
                <SelectItem value="audio/">Audio</SelectItem>
                <SelectItem value="application/pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Select value={attachedFilter} onValueChange={setAttachedFilter}>
              <SelectTrigger style={{ width: 150 }}>
                <SelectValue placeholder="Attached: all" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Attached: all</SelectItem>
                <SelectItem value="attached">Attached only</SelectItem>
                <SelectItem value="unattached">Unattached only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={showTrash ? "trash" : "all"} onValueChange={(v) => setShowTrash(v === "trash")}>
              <SelectTrigger style={{ width: 130 }}>
                <SelectValue placeholder="All files" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All files</SelectItem>
                <SelectItem value="trash">Trash</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger style={{ width: 150 }}>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name-asc">Name A–Z</SelectItem>
                <SelectItem value="name-desc">Name Z–A</SelectItem>
                <SelectItem value="size-desc">Largest first</SelectItem>
                <SelectItem value="size-asc">Smallest first</SelectItem>
              </SelectContent>
            </Select>
            {isMobile && (
              <Button variant="outline" size="sm" onClick={() => { setNewFolderParentId(undefined); setNewFolderOpen(true); }}>
                <FolderPlus size={14} style={{ marginRight: 4 }} />New folder
              </Button>
            )}
          </div>

          {!loading && total > 0 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px" }}>
              {showTrash
                ? `Trash — ${items.length} deleted ${items.length === 1 ? "file" : "files"} (open one to restore it)`
                : `Showing ${items.length} of ${total} ${total === 1 ? "file" : "files"}`}
              {!showTrash && selectedFolderId ? " in this folder" : ""}
            </p>
          )}

          <SelectionToolbar
            count={selectedIds.size}
            onDelete={() => setBulkDeleteOpen(true)}
            onDownload={handleBulkDownload}
            onClear={() => setSelectedIds(new Set())}
          />

          <div style={{ marginTop: selectedIds.size > 0 ? 8 : 0 }}>
            <MediaGrid
              items={items}
              selected={selectedIds}
              onSelect={handleSelect}
              onClick={setDetailItem}
              loading={loading}
            />
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span style={{ display: "flex", alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        folderId={selectedFolderId || undefined}
        onUploadComplete={fetchItems}
      />

      <MetadataPanel
        item={detailItem}
        folders={folders}
        onClose={() => setDetailItem(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onRestore={handleRestore}
      />

      <PromptDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        title="New folder"
        message={newFolderParentId ? "Create a subfolder inside the selected folder." : "Create a folder to organise your media."}
        label="Folder name"
        placeholder="e.g. Projects"
        confirmLabel="Create"
        onConfirm={(name) => handleCreateFolder(name, newFolderParentId)}
      />

      <PromptDialog
        open={!!renameFolder}
        onOpenChange={(v) => { if (!v) setRenameFolder(null); }}
        title="Rename folder"
        label="Folder name"
        placeholder={renameFolder?.name}
        confirmLabel="Rename"
        onConfirm={handleRenameFolder}
      />

      <ConfirmDialog
        open={!!deleteFolder}
        onOpenChange={(v) => { if (!v) setDeleteFolder(null); }}
        title="Delete folder?"
        message={deleteFolder ? `"${deleteFolder.name}" will be deleted. Folders with subfolders or files cannot be deleted — move or delete those first.` : ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteFolder}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete selected media?"
        message={`${selectedIds.size} ${selectedIds.size === 1 ? "file" : "files"} will be moved to trash. You can restore them later.`}
        confirmLabel="Delete"
        variant="danger"
        busy={bulkDeleting}
        busyLabel="Deleting…"
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
