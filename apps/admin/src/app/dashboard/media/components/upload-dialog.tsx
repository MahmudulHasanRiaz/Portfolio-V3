"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Button,
} from "@repo/ui";
import { Upload, X, File, CheckCircle2, AlertCircle } from "lucide-react";

interface UploadFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "done" | "error";
  progress?: number;
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string;
  onUploadComplete: () => void;
}

export function UploadDialog({ open, onOpenChange, folderId, onUploadComplete }: Props) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const entries = Array.from(newFiles).map((f) => ({
      file: f,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadFiles = useCallback(async () => {
    setUploading(true);
    const pending = files.filter((f) => f.status === "pending");

    for (const entry of pending) {
      setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: "uploading" as const } : f));

      try {
        const formData = new FormData();
        formData.append("file", entry.file);
        if (folderId) formData.append("folderId", folderId);

        const res = await fetch("/api/media/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }

        setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: "done" as const } : f));
      } catch (err) {
        setFiles((prev) => prev.map((f) => f.id === entry.id ? {
          ...f, status: "error" as const,
          error: err instanceof Error ? err.message : "Upload failed",
        } : f));
      }
    }

    setUploading(false);
    onUploadComplete();
  }, [files, folderId, onUploadComplete]);

  const hasPending = files.some((f) => f.status === "pending");
  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!uploading) onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
          <DialogDescription>
            Drag &amp; drop files or click to browse. Images: WebP/AVIF preferred (JPEG/PNG ok), max 10 MB,
            quality 75–80 — don&apos;t compress aggressively. No manual resizing needed — images are
            automatically optimized for the public site.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--accent-primary)" : "var(--border-color)"}`,
            borderRadius: 12,
            padding: 32,
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.15s",
            background: dragOver ? "var(--accent-primary-soft, rgba(99,102,241,0.04))" : "transparent",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
            style={{ display: "none" }}
          />
          <Upload size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
            Drop files here or click to browse
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Images (JPEG, PNG, WebP, AVIF, GIF, SVG)
          </p>
        </div>

        {files.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflow: "auto" }}>
            {files.map((entry) => (
              <div key={entry.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 6,
                background: "var(--surface-muted)", fontSize: 13,
              }}>
                <File size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.file.name}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                  {(entry.file.size / 1024).toFixed(0)} KB
                </span>
                {entry.status === "done" && <CheckCircle2 size={14} style={{ color: "var(--accent-success)", flexShrink: 0 }} />}
                {entry.status === "error" && (
                  <span title={entry.error}><AlertCircle size={14} style={{ color: "var(--accent-danger)", flexShrink: 0 }} /></span>
                )}
                {entry.status === "uploading" && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Uploading...</span>}
                {entry.status === "pending" && !uploading && (
                  <button onClick={() => removeFile(entry.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {doneCount > 0 && <span style={{ color: "var(--accent-success)" }}>{doneCount} uploaded </span>}
            {errorCount > 0 && <span style={{ color: "var(--accent-danger)" }}>{errorCount} failed </span>}
            {files.length > 0 && <span>{files.length - doneCount - errorCount} pending</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              {doneCount > 0 ? "Done" : "Cancel"}
            </Button>
            {hasPending && (
              <Button onClick={uploadFiles} disabled={uploading}>
                {uploading ? "Uploading..." : `Upload ${files.filter(f => f.status === "pending").length} files`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
