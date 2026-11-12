"use client";

import { Checkbox } from "@repo/ui";
import { File, Film, Music, FileText, Link2 } from "lucide-react";
import type { MediaItem } from "./media-types";
import { isImageType, MEDIA_TYPE_LABELS, formatFileSize } from "./media-types";
import { useMemo } from "react";

interface Props {
  item: MediaItem;
  selected: boolean;
  onSelect: (id: string, shiftKey: boolean) => void;
  onClick: (item: MediaItem) => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("video/")) return <Film size={24} />;
  if (mimeType.startsWith("audio/")) return <Music size={24} />;
  if (mimeType.startsWith("image/")) return null;
  return <FileText size={24} />;
}

function getThumbnailUrl(item: MediaItem): string {
  if (item.variants?.["thumbnail_webp"]) return item.variants["thumbnail_webp"];
  if (item.variants?.["thumbnail_jpeg"]) return item.variants["thumbnail_jpeg"];
  return item.url;
}

export function MediaItemCard({ item, selected, onSelect, onClick }: Props) {
  const thumbnailUrl = useMemo(() => getThumbnailUrl(item), [item]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".checkbox-area")) return;
        onClick(item);
      }}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(item); }}
      style={{
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        border: selected ? "2px solid var(--brand)" : "1px solid var(--border-color)",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        background: "var(--bg-card)",
        boxShadow: "0 1px 3px rgba(16, 22, 19, 0.06)",
      }}
    >
      <div className="checkbox-area" style={{
        position: "absolute",
        top: 6,
        left: 6,
        zIndex: 2,
      }}>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(item.id, false)}
        />
      </div>

      <div style={{
        width: "100%",
        aspectRatio: "1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-muted)",
        position: "relative",
        overflow: "hidden",
      }}>
        {isImageType(item.type) ? (
          <img
            src={thumbnailUrl}
            alt={item.altText || item.originalName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            loading="lazy"
          />
        ) : (
          <div style={{ color: "var(--text-muted)" }}>
            {getFileIcon(item.type) || <File size={24} />}
          </div>
        )}
      </div>

      <div style={{ padding: "6px 8px" }}>
        <p style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          marginBottom: 2,
        }} title={item.originalName}>
          {item.originalName}
        </p>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--text-muted)",
        }}>
          <span>{MEDIA_TYPE_LABELS[item.type] || item.type.split("/").pop()}</span>
          <span>{formatFileSize(item.size)}</span>
        </div>
        {item.attachedCount !== undefined && item.attachedCount > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
            fontSize: 11,
            fontWeight: 500,
            color: "var(--brand)",
          }}>
            <Link2 size={11} />
            <span>
              Used in {item.attachedCount} {item.attachedCount === 1 ? "place" : "places"}
              {item.attachedTo?.[0] ? ` · ${item.attachedTo[0].type}` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
