"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@repo/ui";
import type { FolderNode } from "./media-types";
import { flattenFolders } from "./media-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderNode[];
  /** How many files are about to move — shown in the title. */
  count: number;
  /** Moves the selected files; must return ok on success. A partial
   *  move (some files failed) still counts as ok — the page reports
   *  the per-file failures in its status line. */
  onConfirm: (folderId: string | null) => Promise<{ ok: boolean; error?: string }>;
}

const TOP_LEVEL = "__top__";

export function BulkMoveDialog({ open, onOpenChange, folders, count, onConfirm }: Props) {
  const [folderId, setFolderId] = useState<string>(TOP_LEVEL);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset every time the dialog opens.
  useEffect(() => {
    if (open) {
      setFolderId(TOP_LEVEL);
      setError("");
      setBusy(false);
    }
  }, [open]);

  const flat = flattenFolders(folders);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await onConfirm(folderId === TOP_LEVEL ? null : folderId);
    setBusy(false);
    if (!result.ok) {
      // Stay open and show the real API error — a silent close hid the
      // routing bug that broke folder creation entirely (PR #7), and a
      // failed move must never look like it worked.
      setError(result.error || "Could not move files.");
      return;
    }
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
            Move {count} {count === 1 ? "file" : "files"}
          </DialogTitle>
          <DialogDescription style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-muted, var(--muted-foreground, #3d4742))" }}>
            Pick the destination folder — all selected files move there in one go.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", display: "block", marginBottom: 6 }}
              >
                Destination folder
              </label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger style={{ height: 40 }}>
                  <SelectValue placeholder="All Media" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOP_LEVEL}>All Media (top level)</SelectItem>
                  {flat.map((f) => (
                    <SelectItem key={f.id} value={f.id} title={f.displayPath}>
                      {f.displayPath}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>
                {folderId === TOP_LEVEL
                  ? "The files will move out of any folder, to the top level."
                  : `The files will move into “${flat.find((f) => f.id === folderId)?.displayPath || ""}”.`}
              </p>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "var(--accent-danger)", margin: 0 }}>{error}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Moving…" : `Move ${count} ${count === 1 ? "file" : "files"}`}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
