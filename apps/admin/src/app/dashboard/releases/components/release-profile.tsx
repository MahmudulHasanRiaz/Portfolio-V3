"use client";

import { useState } from "react";
import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent } from "@repo/ui";
import { Save } from "lucide-react";
import { MediaPicker } from "@/components/media-picker";

interface ReleaseProfileProps {
  release: {
    id: string;
    title: string;
    titleBn: string | null;
    slug: string;
    type: string;
    releaseFormat: string | null;
    description: string | null;
    descriptionBn: string | null;
    coverImage: string | null;
    releaseDate: string | null;
    status: string;
    contentStatus: string;
    isFeatured: boolean | null;
    metaTitle: string | null;
    metaDescription: string | null;
    keywords: string | null;
    ogImage?: string | null;
    canonicalUrl?: string | null;
    credits: Record<string, unknown> | null;
  };
  onUpdate: () => void;
}

const TYPES = ["nasheed", "tilawat", "acting", "podcast", "interview", "documentary"];
const FORMATS = ["single", "ep", "album"];
const STATUSES = ["draft", "published", "archived"];

export function ReleaseProfile({ release, onUpdate }: ReleaseProfileProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pickerTarget, setPickerTarget] = useState<"coverImage" | "ogImage" | null>(null);
  const [form, setForm] = useState({
    title: release.title,
    titleBn: release.titleBn || "",
    slug: release.slug,
    type: release.type,
    format: release.releaseFormat || "",
    description: release.description || "",
    descriptionBn: release.descriptionBn || "",
    coverImage: release.coverImage || "",
    releaseDate: release.releaseDate || "",
    status: release.status,
    contentStatus: release.contentStatus,
    isFeatured: release.isFeatured ? "yes" : "no",
    metaTitle: release.metaTitle || "",
    metaDescription: release.metaDescription || "",
    ogImage: release.ogImage || "",
    canonicalUrl: release.canonicalUrl || "",
    keywords: release.keywords || "",
    credits: JSON.stringify(release.credits || {}, null, 2),
    // Bangla credits live in the credits jsonb as tune_bn / lyricist_bn.
    tuneBn:
      typeof release.credits?.tune_bn === "string"
        ? (release.credits.tune_bn as string)
        : "",
    lyricistBn:
      typeof release.credits?.lyricist_bn === "string"
        ? (release.credits.lyricist_bn as string)
        : "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const body: Record<string, unknown> = { ...form };
      body.isFeatured = form.isFeatured === "yes";

      try {
        const credits = JSON.parse(body.credits as string) as Record<string, unknown>;
        // Bangla credits merge into the credits jsonb (tune_bn /
        // lyricist_bn); clearing a field removes its key.
        const tuneBn = (body.tuneBn as string).trim();
        const lyricistBn = (body.lyricistBn as string).trim();
        if (tuneBn) credits.tune_bn = tuneBn;
        else delete credits.tune_bn;
        if (lyricistBn) credits.lyricist_bn = lyricistBn;
        else delete credits.lyricist_bn;
        body.credits = credits;
      } catch {
        body.credits = null;
      }
      // tuneBn / lyricistBn are not columns — they live inside credits.
      delete body.tuneBn;
      delete body.lyricistBn;

      const res = await fetch(`/api/releases/${release.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent style={{ padding: 24 }}>
        {error && (
          <div style={{ color: "var(--destructive)", marginBottom: 16, fontSize: 14 }}>{error}</div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Basic Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Title</label>
              <Input value={form.title} onChange={(e) => handleChange("title", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Title (Bangla) — বাংলা</label>
              <Input value={form.titleBn} onChange={(e) => handleChange("titleBn", e.target.value)} placeholder="বাংলা শিরোনাম (optional — empty shows the English title)" />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Slug</label>
              <Input value={form.slug} onChange={(e) => handleChange("slug", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Type</label>
              <Select value={form.type} onValueChange={(v) => handleChange("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Format</label>
              <Select value={form.format || "none"} onValueChange={(v) => handleChange("format", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Cover Image URL</label>
              <div style={{ display: "flex", gap: 8 }}>
                <Input value={form.coverImage} onChange={(e) => handleChange("coverImage", e.target.value)} style={{ flex: 1 }} />
                <Button type="button" variant="outline" onClick={() => setPickerTarget("coverImage")}>Choose from library</Button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                WebP/AVIF preferred (JPEG/PNG ok), quality 75–80 — don&apos;t compress aggressively. Upload
                close to the display size; oversized files only waste bandwidth. No manual resizing needed —
                images are automatically optimized for the public site.
              </p>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Release Date</label>
              <Input type="date" value={form.releaseDate} onChange={(e) => handleChange("releaseDate", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Status</label>
              <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Content Status</label>
              <Select value={form.contentStatus} onValueChange={(v) => handleChange("contentStatus", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Featured</label>
              <Select value={form.isFeatured} onValueChange={(v) => handleChange("isFeatured", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Description</label>
            <Textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={4} />
          </div>

          <div>
            <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Description (Bangla) — বাংলা</label>
            <Textarea value={form.descriptionBn} onChange={(e) => handleChange("descriptionBn", e.target.value)} rows={4} placeholder="বাংলা বিবরণ (optional — empty shows the English description)" />
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>SEO</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Meta Title</label>
              <Input value={form.metaTitle} onChange={(e) => handleChange("metaTitle", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Keywords</label>
              <Input value={form.keywords} onChange={(e) => handleChange("keywords", e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Meta Description</label>
            <Textarea value={form.metaDescription} onChange={(e) => handleChange("metaDescription", e.target.value)} rows={2} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>OG Image</label>
              <div style={{ display: "flex", gap: 8 }}>
                <Input value={form.ogImage} onChange={(e) => handleChange("ogImage", e.target.value)} placeholder="https://... (social share image)" style={{ flex: 1 }} />
                <Button type="button" variant="outline" onClick={() => setPickerTarget("ogImage")}>Choose from library</Button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Recommended: 1200×630 (social share). WebP/AVIF preferred (JPEG/PNG ok), quality 75–80 — don&apos;t
                compress aggressively. No manual resizing needed — images are automatically optimized for the
                public site.
              </p>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Canonical URL</label>
              <Input value={form.canonicalUrl} onChange={(e) => handleChange("canonicalUrl", e.target.value)} placeholder="https://riaz.com.bd/releases/..." />
            </div>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Credits (JSON)</h3>
          <Textarea value={form.credits} onChange={(e) => handleChange("credits", e.target.value)} rows={4} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Tune (Bangla) — বাংলা</label>
              <Input value={form.tuneBn} onChange={(e) => handleChange("tuneBn", e.target.value)} placeholder="বাংলা সুরকার (optional — saved into Credits as tune_bn)" />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Lyricist (Bangla) — বাংলা</label>
              <Input value={form.lyricistBn} onChange={(e) => handleChange("lyricistBn", e.target.value)} placeholder="বাংলা গীতিকার (optional — saved into Credits as lyricist_bn)" />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" disabled={saving}>
              <Save size={16} style={{ marginRight: 6 }} />{saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
        <MediaPicker
          open={pickerTarget !== null}
          onOpenChange={(open) => { if (!open) setPickerTarget(null); }}
          onSelect={(url) => handleChange(pickerTarget === "ogImage" ? "ogImage" : "coverImage", url)}
          type="image"
          title={pickerTarget === "ogImage" ? "Choose OG image" : "Choose cover image"}
        />
      </CardContent>
    </Card>
  );
}
