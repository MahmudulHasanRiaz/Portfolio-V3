"use client";

import { useRef, useState } from "react";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { useRouter } from "next/navigation";
import { MediaPicker } from "@/components/media-picker";
import { type PlatformGroup } from "@/actions/directory";
import { TECHNOLOGY_CATEGORIES } from "@/lib/technology-categories";
import type { DirectoryEntity } from "@/components/directory-list";

// Shared create/edit form for the directory tables (Platforms /
// Technologies / Clients). The page wrapper supplies onSubmit (the
// matching create/update server action) and onSaved (navigation); the
// form only collects the fields. All three entities follow the PR #76
// pattern (every English field has its Bangla field next to it).

const labelStyle = { display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 } as const;

const PLATFORM_GROUPS: { value: PlatformGroup; label: string }[] = [
  { value: "music", label: "Music & Streaming" },
  { value: "social", label: "Social Media" },
  { value: "professional", label: "Professional / Code" },
];

export interface DirectoryFormProps {
  entity: DirectoryEntity;
  initial?: Record<string, unknown> | null;
  submitLabel: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onSaved: () => void;
}

export function DirectoryForm({
  entity,
  initial,
  submitLabel,
  onSubmit,
  onSaved,
}: DirectoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [group, setGroup] = useState<PlatformGroup>(
    (initial?.group as PlatformGroup) || "social",
  );
  const [category, setCategory] = useState<string>(
    (initial?.category as string) || "",
  );
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  // Client logo display mode — the select below only shows when a
  // logo URL is set. "logo" (default) renders the logo image only;
  // "name_logo" renders a square icon beside the client name.
  const [logoUrlValue, setLogoUrlValue] = useState<string>(
    (initial?.logoUrl as string) || "",
  );
  const [logoDisplayMode, setLogoDisplayMode] = useState<string>(
    (initial?.logoDisplayMode as string) === "name_logo"
      ? "name_logo"
      : "logo",
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const sortOrderRaw = String(form.get("sortOrder") || "").trim();
    const sortOrder = sortOrderRaw === "" ? null : parseInt(sortOrderRaw, 10);
    if (sortOrderRaw !== "" && !Number.isFinite(sortOrder)) {
      setError("Sort order must be a number");
      setLoading(false);
      return;
    }
    const data: Record<string, unknown> = { sortOrder };
    if (entity === "platforms") {
      Object.assign(data, {
        name: form.get("name"),
        url: form.get("url"),
        handle: form.get("handle"),
        group,
        icon: form.get("icon"),
        subtitle: form.get("subtitle"),
        note: form.get("note"),
        isPrimary: form.get("isPrimary") === "on",
        nameBn: form.get("nameBn"),
        subtitleBn: form.get("subtitleBn"),
      });
    } else if (entity === "technologies") {
      Object.assign(data, {
        name: form.get("name"),
        nameBn: form.get("nameBn"),
        category: category || null,
        icon: form.get("icon"),
        use: form.get("use"),
        useBn: form.get("useBn"),
      });
    } else {
      Object.assign(data, {
        name: form.get("name"),
        logoUrl: form.get("logoUrl"),
        // No logo = no mode (NULL = the "logo" default server-side).
        logoDisplayMode: logoUrlValue.trim() ? logoDisplayMode : null,
        website: form.get("website"),
        nameBn: form.get("nameBn"),
      });
    }
    try {
      await onSubmit(data);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Name</label>
          <Input name="name" defaultValue={(initial?.name as string) || ""} required />
        </div>
        <div>
          <label style={labelStyle}>Name (Bangla) — বাংলা</label>
          <Input name="nameBn" defaultValue={(initial?.nameBn as string) || ""} placeholder="বাংলা নাম (optional — empty shows the English name)" />
        </div>

        {entity === "platforms" && (
          <>
            <div>
              <label style={labelStyle}>URL</label>
              <Input name="url" defaultValue={(initial?.url as string) || ""} placeholder="https://..." required />
            </div>
            <div>
              <label style={labelStyle}>Handle</label>
              <Input name="handle" defaultValue={(initial?.handle as string) || ""} placeholder="@username (optional)" />
            </div>
            <div>
              <label style={labelStyle}>Group</label>
              <Select value={group} onValueChange={(v) => setGroup(v as PlatformGroup)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORM_GROUPS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={labelStyle}>Icon</label>
              <Input name="icon" defaultValue={(initial?.icon as string) || ""} placeholder="Simple Icons slug, e.g. youtube — empty shows a plain chip" />
            </div>
            <div>
              <label style={labelStyle}>Subtitle</label>
              <Input name="subtitle" defaultValue={(initial?.subtitle as string) || ""} placeholder="Card line, e.g. Nasheed channel — @MahmudRiazBD" />
            </div>
            <div>
              <label style={labelStyle}>Subtitle (Bangla) — বাংলা</label>
              <Input name="subtitleBn" defaultValue={(initial?.subtitleBn as string) || ""} placeholder="বাংলা সাবটাইটেল (optional — empty shows the English subtitle)" />
            </div>
            <div>
              <label style={labelStyle}>Note</label>
              <Input name="note" defaultValue={(initial?.note as string) || ""} placeholder="Internal note, e.g. footer primary (optional)" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="isPrimary" name="isPrimary" defaultChecked={initial?.isPrimary === true} />
              <label htmlFor="isPrimary" style={{ fontSize: 14, color: "var(--text-primary)" }}>Footer primary — show in the site footer</label>
            </div>
          </>
        )}

        {entity === "technologies" && (
          <>
            <div>
              <label style={labelStyle}>Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {TECHNOLOGY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={labelStyle}>Icon</label>
              <Input name="icon" defaultValue={(initial?.icon as string) || ""} placeholder="Simple Icons slug, e.g. react — empty shows a plain name chip" />
            </div>
            <div>
              <label style={labelStyle}>Use</label>
              <Input name="use" defaultValue={(initial?.use as string) || ""} placeholder="What it is used for, e.g. Plugin development" />
            </div>
            <div>
              <label style={labelStyle}>Use (Bangla) — বাংলা</label>
              <Input name="useBn" defaultValue={(initial?.useBn as string) || ""} placeholder="বাংলা ব্যবহার (optional — empty shows the English use)" />
            </div>
          </>
        )}

        {entity === "clients" && (
          <>
            <div>
              <label style={labelStyle}>Logo URL</label>
              <div style={{ display: "flex", gap: 8 }}>
                <Input ref={logoRef} name="logoUrl" value={logoUrlValue} onChange={(e) => setLogoUrlValue(e.target.value)} placeholder="https://... (image, optional)" style={{ flex: 1 }} />
                <Button type="button" variant="outline" onClick={() => setLogoPickerOpen(true)}>Choose from library</Button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Recommended: transparent PNG or SVG preferred (WebP also ok) — upload close to the display size,
                don&apos;t upload an oversized file. No manual resizing needed — images are automatically
                optimized for the public site.
              </p>
            </div>
            {logoUrlValue.trim() !== "" && (
              <div>
                <label style={labelStyle}>Logo display</label>
                <Select value={logoDisplayMode} onValueChange={setLogoDisplayMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="logo">Logo only — show just the logo image</SelectItem>
                    <SelectItem value="name_logo">Name + Logo — square icon beside the name</SelectItem>
                  </SelectContent>
                </Select>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                  {logoDisplayMode === "name_logo"
                    ? "For square / 1:1 icon-style logos (favicon-like, round or square) that do NOT have the name in them — the icon shows beside the client name."
                    : "For wide logos (wider than tall) that already contain the name — only the logo image shows. This is the default."}
                </p>
              </div>
            )}
            <div>
              <label style={labelStyle}>Website</label>
              <Input name="website" defaultValue={(initial?.website as string) || ""} placeholder="https://... (optional)" />
            </div>
          </>
        )}

        <div>
          <label style={labelStyle}>Sort order</label>
          <Input name="sortOrder" type="number" defaultValue={initial?.sortOrder !== null && initial?.sortOrder !== undefined ? String(initial.sortOrder) : ""} placeholder="0, 1, 2… — lower shows first" />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : submitLabel}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
        </div>
      </form>
      {entity === "clients" && (
        <MediaPicker
          open={logoPickerOpen}
          onOpenChange={setLogoPickerOpen}
          onSelect={(url) => {
            if (logoRef.current) logoRef.current.value = url;
            setLogoUrlValue(url);
          }}
          type="image"
          title="Choose client logo"
        />
      )}
    </div>
  );
}
