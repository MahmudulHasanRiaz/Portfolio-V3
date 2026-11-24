"use client";

import { useRef, useState } from "react";
import { Button, Input, Textarea, RadioGroup, RadioGroupItem, Checkbox } from "@repo/ui";
import { MediaPicker } from "@/components/media-picker";
import { MediaUrlPreview, MediaUrlListPreview } from "@/components/media-url-preview";

/**
 * Shared Media fields for the Content forms (Blog / Projects / Services /
 * Case Studies) — the thumbnail field the new/edit forms were missing.
 *
 * Self-contained: it renders the inputs with the exact field names the
 * ContentService schemas accept (thumbnailType / thumbnailUrl /
 * thumbnailVideoUrl / thumbnailAutoplay / videos / galleryImages), so the
 * parent form just reads them from FormData on submit. The radio + autoplay
 * state is mirrored into hidden inputs for the same reason. Picking from the
 * Media Library fills the URL fields; nothing is saved until the parent
 * form submits.
 *
 * Services have no videos/galleryImages columns — pass videosAndGallery
 * false and only the thumbnail fields render.
 */

/** One URL per line (videos / gallery images) -> string[]. */
export function parseUrlList(v: FormDataEntryValue | null): string[] {
  if (typeof v !== "string") return [];
  return v.split("\n").map((s) => s.trim()).filter(Boolean);
}

/** Stored string[] (jsonb) -> one URL per line for the textarea. */
function listValue(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return v.filter((i): i is string => typeof i === "string" && i.length > 0).join("\n");
}

/** Stored string[] (jsonb) -> string[] for the preview state. */
function toList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((i): i is string => typeof i === "string" && i.length > 0);
}

const labelStyle = { display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 } as const;

/** Small grey hint under an image field: size + quality-preserving guidance. */
const hintStyle = { fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" } as const;

const AUTO_OPTIMIZE_HINT = "No manual resizing needed — images are automatically optimized for the public site.";

type PickerTarget = "thumbnailUrl" | "thumbnailVideoUrl" | "videos" | "galleryImages" | null;

export function ContentMediaFields({
  initial,
  videosAndGallery = true,
}: {
  /** The loaded row (edit) — a Record<string, unknown> is fine. Omit for new. */
  initial?: Record<string, unknown>;
  /** False for Services (thumbnail only — no videos/gallery columns). */
  videosAndGallery?: boolean;
}) {
  const [thumbnailType, setThumbnailType] = useState<"image" | "video">(
    initial?.thumbnailType === "video" ? "video" : "image",
  );
  const [thumbnailAutoplay, setThumbnailAutoplay] = useState(initial?.thumbnailAutoplay === true);
  const thumbUrlRef = useRef<HTMLInputElement>(null);
  const thumbVideoUrlRef = useRef<HTMLInputElement>(null);
  const videosRef = useRef<HTMLTextAreaElement>(null);
  const galleryRef = useRef<HTMLTextAreaElement>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  // Selected-state previews — the URL inputs stay the fields that save
  // (FormData reads them), these only mirror what they hold so the picked
  // file shows as its image, not as a bare link. A pasted/typed URL
  // previews the same way via the inputs' onChange.
  const [thumbPreview, setThumbPreview] = useState((initial?.thumbnailUrl as string) || "");
  const [thumbVideoPreview, setThumbVideoPreview] = useState((initial?.thumbnailVideoUrl as string) || "");
  const [videosPreview, setVideosPreview] = useState<string[]>(toList(initial?.videos));
  const [galleryPreview, setGalleryPreview] = useState<string[]>(toList(initial?.galleryImages));

  const handlePickerSelect = (url: string) => {
    const appendLine = (ref: React.RefObject<HTMLTextAreaElement | null>) => {
      if (!ref.current) return;
      ref.current.value = ref.current.value
        ? `${ref.current.value.replace(/\n*$/, "")}\n${url}`
        : url;
    };
    if (pickerTarget === "thumbnailUrl" && thumbUrlRef.current) {
      thumbUrlRef.current.value = url;
      setThumbPreview(url);
    } else if (pickerTarget === "thumbnailVideoUrl" && thumbVideoUrlRef.current) {
      thumbVideoUrlRef.current.value = url;
      setThumbVideoPreview(url);
    } else if (pickerTarget === "videos") {
      appendLine(videosRef);
      setVideosPreview((prev) => [...prev, url]);
    } else if (pickerTarget === "galleryImages") {
      appendLine(galleryRef);
      setGalleryPreview((prev) => [...prev, url]);
    }
  };

  /** Remove one line from a URL-list textarea, keeping the field + preview in sync. */
  const removeListItem = (
    ref: React.RefObject<HTMLTextAreaElement | null>,
    list: string[],
    setList: (next: string[]) => void,
    index: number,
  ) => {
    const next = list.filter((_, i) => i !== index);
    setList(next);
    if (ref.current) ref.current.value = next.join("\n");
  };

  return (
    <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Media</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Thumbnail type</label>
          <RadioGroup value={thumbnailType} onValueChange={(v) => setThumbnailType(v as "image" | "video")} style={{ display: "flex", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <RadioGroupItem value="image" id="thumb-image" />
              <label htmlFor="thumb-image" style={{ fontSize: 14, color: "var(--text-primary)" }}>Image</label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <RadioGroupItem value="video" id="thumb-video" />
              <label htmlFor="thumb-video" style={{ fontSize: 14, color: "var(--text-primary)" }}>Video</label>
            </div>
          </RadioGroup>
          <input type="hidden" name="thumbnailType" value={thumbnailType} />
        </div>
        <div>
          <label style={labelStyle}>Thumbnail image URL</label>
          <div style={{ display: "flex", gap: 8 }}>
            <Input ref={thumbUrlRef} name="thumbnailUrl" defaultValue={(initial?.thumbnailUrl as string) || ""} placeholder="https://... (image)" style={{ flex: 1 }} onChange={(e) => setThumbPreview(e.target.value)} />
            <Button type="button" variant="outline" onClick={() => setPickerTarget("thumbnailUrl")}>Choose from library</Button>
          </div>
          <MediaUrlPreview
            url={thumbPreview}
            kind="image"
            onRemove={() => {
              if (thumbUrlRef.current) thumbUrlRef.current.value = "";
              setThumbPreview("");
            }}
          />
          <p style={hintStyle}>
            Recommended: 1200×630. WebP/AVIF preferred (JPEG/PNG ok), quality 75–80 — don&apos;t compress
            aggressively. Upload close to the display size. {AUTO_OPTIMIZE_HINT}
          </p>
        </div>
        <div>
          <label style={labelStyle}>Thumbnail video URL</label>
          <div style={{ display: "flex", gap: 8 }}>
            <Input ref={thumbVideoUrlRef} name="thumbnailVideoUrl" defaultValue={(initial?.thumbnailVideoUrl as string) || ""} placeholder="https://... (video, used when type is Video)" style={{ flex: 1 }} onChange={(e) => setThumbVideoPreview(e.target.value)} />
            <Button type="button" variant="outline" onClick={() => setPickerTarget("thumbnailVideoUrl")}>Choose from library</Button>
          </div>
          <MediaUrlPreview
            url={thumbVideoPreview}
            kind="video"
            onRemove={() => {
              if (thumbVideoUrlRef.current) thumbVideoUrlRef.current.value = "";
              setThumbVideoPreview("");
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Checkbox id="thumb-autoplay" checked={thumbnailAutoplay} onCheckedChange={(v) => setThumbnailAutoplay(v === true)} />
          <label htmlFor="thumb-autoplay" style={{ fontSize: 14, color: "var(--text-primary)" }}>Autoplay thumbnail video (muted, per browser rules)</label>
          <input type="hidden" name="thumbnailAutoplay" value={thumbnailAutoplay ? "true" : "false"} />
        </div>
        {videosAndGallery && (
          <>
            <div>
              <label style={labelStyle}>Videos (one URL per line)</label>
              <Textarea ref={videosRef} name="videos" defaultValue={listValue(initial?.videos)} placeholder={"https://.../demo-1.mp4\nhttps://.../demo-2.mp4"} rows={3} onChange={(e) => setVideosPreview(parseUrlList(e.target.value))} />
              <MediaUrlListPreview
                urls={videosPreview}
                kind="video"
                onRemove={(i) => removeListItem(videosRef, videosPreview, setVideosPreview, i)}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setPickerTarget("videos")} style={{ marginTop: 8 }}>Add from library</Button>
            </div>
            <div>
              <label style={labelStyle}>Gallery images (one URL per line)</label>
              <Textarea ref={galleryRef} name="galleryImages" defaultValue={listValue(initial?.galleryImages)} placeholder={"https://.../shot-1.jpg\nhttps://.../shot-2.jpg"} rows={3} onChange={(e) => setGalleryPreview(parseUrlList(e.target.value))} />
              <MediaUrlListPreview
                urls={galleryPreview}
                kind="image"
                onRemove={(i) => removeListItem(galleryRef, galleryPreview, setGalleryPreview, i)}
              />
              <p style={hintStyle}>
                Recommended: up to 1600px wide. WebP/AVIF preferred (JPEG/PNG ok), quality 75–80 — don&apos;t
                compress aggressively. Upload close to the display size. {AUTO_OPTIMIZE_HINT}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => setPickerTarget("galleryImages")} style={{ marginTop: 8 }}>Add from library</Button>
            </div>
          </>
        )}
      </div>
      <MediaPicker
        open={pickerTarget !== null}
        onOpenChange={(open) => { if (!open) setPickerTarget(null); }}
        onSelect={handlePickerSelect}
        type={pickerTarget === "thumbnailVideoUrl" || pickerTarget === "videos" ? "video" : "image"}
        title={
          pickerTarget === "thumbnailVideoUrl" ? "Choose thumbnail video"
            : pickerTarget === "videos" ? "Add video"
            : pickerTarget === "galleryImages" ? "Add gallery image"
            : "Choose thumbnail image"
        }
      />
    </div>
  );
}
