"use client";

import { useRef, useState } from "react";
import { Button, Input, Textarea } from "@repo/ui";
import { MediaPicker } from "@/components/media-picker";

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
}: {
  /** The loaded row (edit) — a Record<string, unknown> is fine. */
  initial?: Record<string, unknown>;
}) {
  const ogImageRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

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
            <Input ref={ogImageRef} name="ogImage" defaultValue={(initial?.ogImage as string) || ""} placeholder="https://... (image shown when the page is shared)" style={{ flex: 1 }} />
            <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>Choose from library</Button>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Canonical URL</label>
          <Input name="canonicalUrl" defaultValue={(initial?.canonicalUrl as string) || ""} placeholder="https://... (empty = the item's own URL)" />
        </div>
      </div>
      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => {
          if (ogImageRef.current) ogImageRef.current.value = url;
        }}
        type="image"
        title="Choose OG image"
      />
    </div>
  );
}
