"use client";

import { Button } from "@repo/ui";
import { Trash2, Download, X } from "lucide-react";

interface Props {
  count: number;
  onDelete: () => void;
  onDownload: () => void;
  onClear: () => void;
}

export function SelectionToolbar({ count, onDelete, onDownload, onClear }: Props) {
  if (count === 0) return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 12,
      background: "var(--brand-50, rgba(12, 124, 108, 0.08))",
      border: "1px solid var(--brand)",
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--accent-primary)", flex: 1 }}>
        {count} selected
      </span>
      <Button variant="outline" size="sm" onClick={onDownload}>
        <Download size={14} style={{ marginRight: 4 }} />Download
      </Button>
      <Button variant="outline" size="sm" onClick={onDelete} style={{ color: "var(--accent-danger)" }}>
        <Trash2 size={14} style={{ marginRight: 4 }} />Delete
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear}>
        <X size={14} />
      </Button>
    </div>
  );
}
