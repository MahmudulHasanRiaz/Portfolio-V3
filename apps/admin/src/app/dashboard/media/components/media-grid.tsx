"use client";

import type { MediaItem } from "./media-types";
import { MediaItemCard } from "./media-item";
import { EmptyState } from "@repo/ui";
import { Image } from "lucide-react";

interface Props {
  items: MediaItem[];
  selected: Set<string>;
  onSelect: (id: string, shiftKey: boolean) => void;
  onClick: (item: MediaItem) => void;
  loading?: boolean;
}

export function MediaGrid({ items, selected, onSelect, onClick, loading }: Props) {
  if (loading) {
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 12,
      }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid var(--border-color)",
            background: "var(--bg-card)",
          }}>
            <div style={{
              width: "100%",
              aspectRatio: "1",
              background: "var(--surface-muted)",
              animation: "pulse 1.5s infinite",
            }} />
            <div style={{ padding: "6px 8px" }}>
              <div style={{ height: 12, width: "70%", background: "var(--surface-muted)", borderRadius: 4, marginBottom: 4 }} />
              <div style={{ height: 10, width: "40%", background: "var(--surface-muted)", borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Image size={32} />}
        title="No media found"
        description="Upload files or adjust your search filters."
      />
    );
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
      gap: 12,
    }}>
      {items.map((item) => (
        <MediaItemCard
          key={item.id}
          item={item}
          selected={selected.has(item.id)}
          onSelect={onSelect}
          onClick={onClick}
        />
      ))}
    </div>
  );
}
