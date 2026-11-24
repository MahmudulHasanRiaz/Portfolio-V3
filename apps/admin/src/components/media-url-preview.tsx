"use client";

import { useState } from "react";
import { FileText, ImageOff, Video as VideoIcon, X } from "lucide-react";

/**
 * Selected-media preview — what a form field shows AFTER the user picks
 * a file from the Media Library.
 *
 * The picker fills the field with a URL; a bare URL (a long link) tells
 * the user nothing about which image they picked. These components render
 * the image itself — a thumbnail + filename — so the selection is obvious
 * at a glance. Non-images get a sensible preview instead: a muted video
 * frame, or a file icon + filename.
 *
 * The URL input stays as the field that saves — the preview is
 * display-only and never changes what a form submits. A remove (X)
 * button clears the selection in the parent form.
 *
 * Used by every form that takes a media URL: ContentMediaFields
 * (thumbnail / videos / gallery), ContentSeoFields (OG image),
 * DirectoryForm (client logo), VentureProfile / ReleaseProfile
 * (logo / cover / thumbnail / gallery / OG image) and the expense
 * receipt URL.
 */

export type MediaUrlKind = "image" | "video" | "all";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "avif", "gif", "svg", "bmp", "ico"];
const VIDEO_EXTS = ["mp4", "webm", "mov", "m4v", "avi", "mkv"];

/** "https://…/covers/projects/foo.jpg?x=1" -> "foo.jpg". Falls back to the URL itself. */
export function fileNameFromUrl(url: string): string {
  try {
    const path = url.split("?")[0]?.split("#")[0] ?? "";
    const last = path.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(last) || url;
  } catch {
    return url;
  }
}

function kindFromUrl(url: string): "image" | "video" | "file" {
  const ext = (url.split("?")[0]?.split("#")[0]?.split(".").pop() || "").toLowerCase();
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (VIDEO_EXTS.includes(ext)) return "video";
  return "file";
}

/** The extension is authoritative for media; a forced kind only applies to extension-less URLs. */
function resolveKind(url: string, kind: MediaUrlKind): "image" | "video" | "file" {
  const extKind = kindFromUrl(url);
  if (extKind !== "file") return extKind;
  if (kind === "all") return "file";
  return kind;
}

const KIND_LABEL: Record<"image" | "video" | "file", string> = {
  image: "Image",
  video: "Video",
  file: "File",
};

/** The visual itself — image, muted video frame, or file/broken placeholder. Fills its parent box. */
function PreviewThumb({ url, kind }: { url: string; kind: MediaUrlKind }) {
  const [broken, setBroken] = useState(false);
  const effective = resolveKind(url, kind);
  if (effective === "image" && !broken) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={url}
        alt={fileNameFromUrl(url)}
        onError={() => setBroken(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  }
  if (effective === "video") {
    return (
      <span style={{ position: "relative", display: "block", width: "100%", height: "100%" }}>
        <video
          src={url}
          muted
          playsInline
          preload="metadata"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <span
          style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "#fff", background: "rgba(0,0,0,0.25)", pointerEvents: "none",
          }}
        >
          <VideoIcon size={20} />
        </span>
      </span>
    );
  }
  // File, or an image URL that failed to load — never a broken-image icon on a black box.
  return (
    <span
      style={{
        width: "100%", height: "100%", display: "flex",
        alignItems: "center", justifyContent: "center", color: "var(--text-muted)",
      }}
    >
      {effective === "image" ? <ImageOff size={22} /> : <FileText size={22} />}
    </span>
  );
}

/** One selected file: thumbnail + filename (+ type), with an optional remove button. */
export function MediaUrlPreview({
  url,
  kind = "all",
  onRemove,
}: {
  url: string;
  /** "image" | "video" forces that preview; "all" (default) detects from the extension. */
  kind?: MediaUrlKind;
  /** Shown as an X — clears the selection in the parent form. */
  onRemove?: () => void;
}) {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const effective = resolveKind(trimmed, kind);
  return (
    <div
      style={{
        display: "flex", gap: 10, alignItems: "center", marginTop: 8,
        padding: 8, border: "1px solid var(--border)", borderRadius: 8,
        background: "var(--surface-2)",
      }}
    >
      <div
        style={{
          width: 96, height: 72, flexShrink: 0, borderRadius: 6,
          overflow: "hidden", border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <PreviewThumb url={trimmed} kind={kind} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          title={trimmed}
          style={{
            margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {fileNameFromUrl(trimmed)}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
          {KIND_LABEL[effective]}
        </p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${fileNameFromUrl(trimmed)}`}
          style={{
            flexShrink: 0, background: "none", border: "none",
            cursor: "pointer", padding: 4, color: "var(--text-muted)",
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/** A URL list (gallery / videos): one tile per file, each removable. */
export function MediaUrlListPreview({
  urls,
  kind = "all",
  onRemove,
}: {
  urls: string[];
  kind?: MediaUrlKind;
  onRemove?: (index: number) => void;
}) {
  const list = urls.map((u) => u.trim()).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 8, marginTop: 8,
      }}
    >
      {list.map((u, i) => (
        <div
          key={`${u}-${i}`}
          style={{
            position: "relative", border: "1px solid var(--border)",
            borderRadius: 8, overflow: "hidden", background: "var(--surface-2)",
          }}
        >
          <div style={{ aspectRatio: "4 / 3", background: "var(--surface)" }}>
            <PreviewThumb url={u} kind={kind} />
          </div>
          <p
            title={u}
            style={{
              margin: 0, padding: "6px 8px", fontSize: 12, fontWeight: 500,
              color: "var(--text-primary)", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {fileNameFromUrl(u)}
          </p>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove ${fileNameFromUrl(u)}`}
              style={{
                position: "absolute", top: 6, right: 6, width: 22, height: 22,
                borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff",
                border: "none", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
