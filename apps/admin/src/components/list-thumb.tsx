"use client";

// List thumbnail — the 56×40 cover used by the admin list pages (blog,
// projects, case studies, services). A stored thumbnail URL can go dead
// (wrong key, deleted file, unreachable host); a raw <img> then renders
// as a broken-image icon on a black box. This component hides a failed
// image and shows a neutral placeholder instead, so a dead URL can
// never look broken — the row still reads fine and the editor can fix
// the URL from the edit form.
import { useState } from "react";
import { ImageOff } from "lucide-react";

export function ListThumb({ src, alt = "" }: { src: string; alt?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <span
        aria-label={alt || "No thumbnail"}
        title={alt || "Thumbnail unavailable"}
        style={{
          width: 56,
          height: 40,
          borderRadius: 6,
          flexShrink: 0,
          backgroundColor: "var(--bg-tertiary, var(--border))",
          color: "var(--text-muted)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ImageOff size={16} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      style={{
        width: 56,
        height: 40,
        objectFit: "cover",
        borderRadius: 6,
        flexShrink: 0,
      }}
    />
  );
}
