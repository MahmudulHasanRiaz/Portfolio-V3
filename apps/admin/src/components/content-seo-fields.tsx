"use client";

import { useRef, useState } from "react";
import { Button, Input, Textarea } from "@repo/ui";
import { MediaPicker } from "@/components/media-picker";
import { MediaUrlPreview } from "@/components/media-url-preview";

/**
 * Shared SEO fields for the Content forms (Blog / Projects / Services /
 * Case Studies) — the per-item meta fields the edit forms were missing.
 *
 * Self-contained like ContentMediaFields: it renders the inputs with the
 * exact field names the ContentService schemas accept (metaTitle /
 * metaDescription / ogImage / canonicalUrl / keywords), so the parent form
 * just reads them from FormData on submit. Picking from the Media Library
 * fills the OG image URL; nothing is saved until the parent form submits.
 * The columns exist on all five content tables, so these fields save today.
 */

const labelStyle = { display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 } as const;

export function ContentSeoFields({
  initial,
  showIndexable = true,
}: {
  /** The loaded row (edit) — a Record<string, unknown> is fine. */
  initial?: Record<string, unknown>;
  /** Hide the per-item indexing toggle (services have no public
   * detail page, so there is nothing to index). */
  showIndexable?: boolean;
}) {
  const ogImageRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Selected-state preview — the OG Image input stays the field that saves
  // (FormData reads it); this only mirrors what it holds so the picked
  // image shows as its image, not as a bare link.
  const [ogPreview, setOgPreview] = useState((initial?.ogImage as string) || "");

  return (
    <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>SEO</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Meta Title</label>
            <Input name="metaTitle" defaultValue={(initial?.metaTitle as string) || ""} placeholder="Page title for search results (empty = item title)" />
          </div>
          <div>
            <label style={labelStyle}>Keywords</label>
            <Input name="keywords" defaultValue={(initial?.keywords as string) || ""} placeholder="comma, separated, keywords" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Meta Description</label>
          <Textarea name="metaDescription" defaultValue={(initial?.metaDescription as string) || ""} rows={2} placeholder="Short description for search results (empty = excerpt / summary)" />
        </div>
        <div>
          <label style={labelStyle}>OG Image URL</label>
          <div style={{ display: "flex", gap: 8 }}>
            <Input ref={ogImageRef} name="ogImage" defaultValue={(initial?.ogImage as string) || ""} placeholder="https://... (image shown when the page is shared)" style={{ flex: 1 }} onChange={(e) => setOgPreview(e.target.value)} />
            <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>Choose from library</Button>
          </div>
          <MediaUrlPreview
            url={ogPreview}
            kind="image"
            onRemove={() => {
              if (ogImageRef.current) ogImageRef.current.value = "";
              setOgPreview("");
            }}
          />
        </div>
        <div>
          <label style={labelStyle}>Canonical URL</label>
          <Input name="canonicalUrl" defaultValue={(initial?.canonicalUrl as string) || ""} placeholder="https://... (empty = the item's own URL)" />
        </div>
        {showIndexable ? (
          <div>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" name="indexable" defaultChecked={initial?.indexable !== false} style={{ width: 16, height: 16, accentColor: "var(--accent, #2563eb)" }} />
              Search indexing — allow search engines to index this page
            </label>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0 24px" }}>
              Off keeps this page out of search results (noindex) and out of the sitemap, even when the
              global indexing switch is on. Unchecked items stay unpublished-safe: flipping it back on
              re-indexes the page. The global switch still governs everything — when it is off, nothing
              indexes regardless of this setting.
            </p>
          </div>
        ) : null}
      </div>
      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => {
          if (ogImageRef.current) ogImageRef.current.value = url;
          setOgPreview(url);
        }}
        type="image"
        title="Choose OG image"
      />
    </div>
  );
}
