"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@repo/ui";
import type { FolderNode } from "./media-types";
import { flattenFolders } from "./media-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderNode[];
  /** Preselected parent (from the tree "+" button or the current folder);
   *  undefined = top level. The user can change it in the dialog. */
  defaultParentId?: string;
  /** Creates the folder; must return ok + the new id on success. */
  onConfirm: (name: string, parentId?: string) => Promise<{ ok: boolean; error?: string; id?: string }>;
  /** Called with the new folder id on success, so the page can select it. */
  onCreated?: (id: string) => void;
}

const TOP_LEVEL = "__top__";

export function NewFolderDialog({ open, onOpenChange, folders, defaultParentId, onConfirm, onCreated }: Props) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>(TOP_LEVEL);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset every time the dialog opens, with the caller's parent preselected.
  useEffect(() => {
    if (open) {
      setName("");
      setParentId(defaultParentId || TOP_LEVEL);
      setError("");
      setBusy(false);
    }
  }, [open, defaultParentId]);

  const flat = flattenFolders(folders);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    const result = await onConfirm(trimmed, parentId === TOP_LEVEL ? undefined : parentId);
    setBusy(false);
    if (!result.ok) {
      // Stay open and show the real API error — a silent close hid the
      // routing bug that broke folder creation entirely (PR #7).
      setError(result.error || "Could not create folder.");
      return;
    }
    if (result.id) onCreated?.(result.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          maxWidth: 440,
          background: "var(--bg-card, var(--surface, #ffffff))",
          border: "1px solid var(--border, #dfe6e1)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "var(--shadow-lg, 0 24px 64px -16px rgba(16, 22, 19, 0.28))",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary, var(--foreground, #101613))" }}>
            New folder
          </DialogTitle>
          <DialogDescription style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-muted, var(--muted-foreground, #3d4742))" }}>
            Folders can nest as deep as you need — pick where this one lives.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: 6 }}
              >
                Folder name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jannat Fashion"
                autoFocus
                maxLength={100}
                style={{ height: 40 }}
              />
            </div>

            <div>
              <label
                style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: 6 }}
              >
                Parent folder
              </label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger style={{ height: 40 }}>
                  <SelectValue placeholder="Top level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOP_LEVEL}>Top level (no parent)</SelectItem>
                  {flat.map((f) => (
                    <SelectItem key={f.id} value={f.id} title={f.displayPath}>
                      {f.displayPath}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
                {parentId === TOP_LEVEL
                  ? "The folder will sit at the top level, next to All Media."
                  : `The folder will be created inside “${flat.find((f) => f.id === parentId)?.displayPath || ""}”.`}
              </p>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "var(--accent-danger)", margin: 0 }}>{error}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
