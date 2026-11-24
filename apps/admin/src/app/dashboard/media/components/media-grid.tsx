"use client";

import type { MediaItem, MediaItemGroup } from "./media-types";
import { MediaItemCard } from "./media-item";
import { EmptyState } from "@repo/ui";
import { Image } from "lucide-react";

interface Props {
  items: MediaItem[];
  /** Recursive-view groups (a folder open shows its subtree, grouped by
   *  folder). When absent — or a single group — the flat grid renders
   *  exactly as before, with no headers. */
  groups?: MediaItemGroup[];
  selected: Set<string>;
  onSelect: (id: string, shiftKey: boolean) => void;
  onClick: (item: MediaItem) => void;
  loading?: boolean;
}

export function MediaGrid({ items, groups, selected, onSelect, onClick, loading }: Props) {
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

  // Recursive view with more than one folder: a small header per folder
  // ("Project's Content / Jannat Fashion", "… / Unorganized") above that
  // folder's tiles, so the subtree reads as groups, not one flat pile.
  if (groups && groups.length > 1) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {groups.map((group) => (
          <div key={group.key}>
            <div style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {group.label}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {group.items.length} {group.items.length === 1 ? "file" : "files"}
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 12,
            }}>
              {group.items.map((item) => (
                <MediaItemCard
                  key={item.id}
                  item={item}
                  selected={selected.has(item.id)}
                  onSelect={onSelect}
                  onClick={onClick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
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
