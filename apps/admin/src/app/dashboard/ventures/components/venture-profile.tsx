"use client";

import { useState } from "react";
import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent, Checkbox } from "@repo/ui";
import { Save } from "lucide-react";
import { MediaPicker } from "@/components/media-picker";

/** Stored string[] (jsonb) -> one URL per line for the textarea. */
function listValue(v: string[] | null | undefined): string {
  if (!Array.isArray(v)) return "";
  return v.filter((i): i is string => typeof i === "string" && i.length > 0).join("\n");
}

/** One URL per line (videos / gallery images) -> string[]. */
function parseUrlList(v: string): string[] {
  return v.split("\n").map((s) => s.trim()).filter(Boolean);
}

interface VentureProfileProps {
  venture: {
    id: string;
    name: string | null;
    nameBn: string | null;
    slug: string;
    description: string | null;
    descriptionBn: string | null;
    logo: string | null;
    website: string | null;
    foundedDate: string | null;
    /** Optional — present only once migration 0035 (founded_year)
     * has landed (same detection pattern as the 0029 columns below). */
    foundedYear?: number | null;
    contentStatus: string;
    coverImage: string | null;
    socialLinks: Record<string, string> | null;
    metrics: Record<string, unknown> | null;
    teamSize: number | null;
    industry: string | null;
    stage: string | null;
    location: string | null;
    status: string;
    isFeatured: boolean | null;
    // Media system (0010/0017): same shape as projects.
    thumbnailType: string | null;
    thumbnailUrl: string | null;
    thumbnailVideoUrl: string | null;
    thumbnailAutoplay: boolean | null;
    videos: string[] | null;
    galleryImages: string[] | null;
    metaTitle: string | null;
    metaDescription: string | null;
    keywords: string | null;
    /** Optional — present only once migration 0029 (short_description /
     * short_description_bn / sort_order) has landed. */
    shortDescription?: string | null;
    shortDescriptionBn?: string | null;
    sortOrder?: number | null;
    ogImage?: string | null;
    canonicalUrl?: string | null;
  };
  onUpdate: () => void;
}

export function VentureProfile({ venture, onUpdate }: VentureProfileProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Media Picker — fills a URL field (or appends a line to a URL list).
  const [pickerTarget, setPickerTarget] = useState<"logo" | "coverImage" | "thumbnailUrl" | "thumbnailVideoUrl" | "videos" | "galleryImages" | "ogImage" | null>(null);
  // Migration 0029 detection: the short-description columns exist only
  // when the loaded row carries them. Until then the fields below render
  // as a pending note and are never sent to the API (a pre-migration
  // PATCH with an unknown column would 500 the whole save).
  const shortDescSupported = "shortDescription" in venture;

  // Migration 0035 detection: the founded_year column exists only
  // when the loaded row carries it. Until then the year field below
  // renders as a pending note and is never sent to the API (a
  // pre-migration PATCH with an unknown column would 500 the whole
  // save) — same pattern as shortDescSupported / migration 0029.
  const foundedYearSupported = "foundedYear" in venture;

  const handlePickerSelect = (url: string) => {
    if (!pickerTarget) return;
    if (pickerTarget === "videos" || pickerTarget === "galleryImages") {
      const current = form[pickerTarget];
      handleChange(pickerTarget, current ? `${current.replace(/\n*$/, "")}\n${url}` : url);
    } else {
      handleChange(pickerTarget, url);
    }
  };
  const [form, setForm] = useState({
    name: venture.name || "",
    nameBn: venture.nameBn || "",
    slug: venture.slug,
    description: venture.description || "",
    descriptionBn: venture.descriptionBn || "",
    logo: venture.logo || "",
    website: venture.website || "",
    foundedDate: venture.foundedDate || "",
    // Migration 0035: year only (e.g. 2024) when no exact date is known.
    foundedYear: venture.foundedYear?.toString() || "",
    contentStatus: venture.contentStatus,
    coverImage: venture.coverImage || "",
    socialLinks: JSON.stringify(venture.socialLinks || {}, null, 2),
    metrics: JSON.stringify(venture.metrics || {}, null, 2),
    teamSize: venture.teamSize?.toString() || "",
    industry: venture.industry || "",
    stage: venture.stage || "",
    location: venture.location || "",
    status: venture.status,
    isFeatured: venture.isFeatured || false,
    // Media system (0010/0017)
    thumbnailType: venture.thumbnailType || "image",
    thumbnailUrl: venture.thumbnailUrl || "",
    thumbnailVideoUrl: venture.thumbnailVideoUrl || "",
    thumbnailAutoplay: venture.thumbnailAutoplay || false,
    videos: listValue(venture.videos),
    galleryImages: listValue(venture.galleryImages),
    metaTitle: venture.metaTitle || "",
    metaDescription: venture.metaDescription || "",
    ogImage: venture.ogImage || "",
    canonicalUrl: venture.canonicalUrl || "",
    keywords: venture.keywords || "",
    // Migration 0029: short description + sort order (archive card).
    shortDescription: venture.shortDescription || "",
    shortDescriptionBn: venture.shortDescriptionBn || "",
    sortOrder: venture.sortOrder?.toString() || "",
  });

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Founded date / year are mutually exclusive: entering one clears
      // the other immediately, so a save can never store both (and a
      // year is never faked as a 01/01 date).
      if (field === "foundedYear" && typeof value === "string" && value.trim() !== "") next.foundedDate = "";
      if (field === "foundedDate" && typeof value === "string" && value.trim() !== "") next.foundedYear = "";
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const body: Record<string, unknown> = { ...form };
      if (body.teamSize) body.teamSize = parseInt(body.teamSize as string, 10);
      else body.teamSize = null;

      // Founded year (0035): a 4-digit year, 1900–2100, or empty (null).
      // An invalid year blocks the save with an error — never guessed.
      if (foundedYearSupported) {
        const yearRaw = (body.foundedYear as string).trim();
        if (yearRaw === "") {
          body.foundedYear = null;
        } else if (!/^\d{4}$/.test(yearRaw) || Number(yearRaw) < 1900 || Number(yearRaw) > 2100) {
          setError("Founded year must be a 4-digit year between 1900 and 2100.");
          setSaving(false);
          return;
        } else {
          body.foundedYear = Number(yearRaw);
          // A year clears the full date (mutual exclusion — also
          // enforced live in handleChange; this covers a stale value).
          body.foundedDate = null;
        }
      } else {
        delete body.foundedYear;
      }
      // A full date clears the year (same mutual exclusion — also
      // enforced live in handleChange; this covers a stale value).
      if (body.foundedDate && foundedYearSupported) body.foundedYear = null;

      try { body.socialLinks = JSON.parse(body.socialLinks as string); }
      catch { body.socialLinks = null; }

      try { body.metrics = JSON.parse(body.metrics as string); }
      catch { body.metrics = null; }

      // Media system (0010/0017): one URL per line -> string[] (jsonb).
      body.videos = parseUrlList(body.videos as string);
      body.galleryImages = parseUrlList(body.galleryImages as string);

      // Only send the D1a columns when the migration has landed.
      if (shortDescSupported) {
        body.sortOrder = body.sortOrder ? Number(body.sortOrder) : null;
      } else {
        delete body.shortDescription;
        delete body.shortDescriptionBn;
        delete body.sortOrder;
      }

      const res = await fetch(`/api/ventures/${venture.id}`, {
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
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Name</label>
              <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Name (Bangla) — বাংলা</label>
              <Input value={form.nameBn} onChange={(e) => handleChange("nameBn", e.target.value)} placeholder="বাংলা নাম (optional — empty shows the English name)" />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Slug</label>
              <Input value={form.slug} onChange={(e) => handleChange("slug", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Website</label>
              <Input value={form.website} onChange={(e) => handleChange("website", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Logo URL</label>
              <div style={{ display: "flex", gap: 8 }}>
                <Input value={form.logo} onChange={(e) => handleChange("logo", e.target.value)} style={{ flex: 1 }} />
                <Button type="button" variant="outline" onClick={() => setPickerTarget("logo")}>Choose from library</Button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Recommended: transparent PNG or SVG preferred (WebP also ok) — upload close to the display size,
                don&apos;t upload an oversized file. No manual resizing needed — images are automatically
                optimized for the public site.
              </p>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Cover Image URL</label>
              <div style={{ display: "flex", gap: 8 }}>
                <Input value={form.coverImage} onChange={(e) => handleChange("coverImage", e.target.value)} style={{ flex: 1 }} />
                <Button type="button" variant="outline" onClick={() => setPickerTarget("coverImage")}>Choose from library</Button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Recommended: 1200×630. WebP/AVIF preferred (JPEG/PNG ok), quality 75–80 — don&apos;t compress
                aggressively. Upload close to the display size. No manual resizing needed — images are
                automatically optimized for the public site.
              </p>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Founded Date</label>
              <Input type="date" value={form.foundedDate} onChange={(e) => handleChange("foundedDate", e.target.value)} />
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Enter a full date OR a year below — saving one clears the other.
              </p>
            </div>
            {foundedYearSupported ? (
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Founded Year</label>
                <Input value={form.foundedYear} onChange={(e) => handleChange("foundedYear", e.target.value)} placeholder="e.g. 2024" inputMode="numeric" />
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                  Year only, when no exact date is known (1900–2100). Never faked as 01/01.
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                The founded-year field needs migration 0035 — it will appear here once it has landed.
              </p>
            )}
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Industry</label>
              <Input value={form.industry} onChange={(e) => handleChange("industry", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Stage</label>
              <Input value={form.stage} onChange={(e) => handleChange("stage", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Location</label>
              <Input value={form.location} onChange={(e) => handleChange("location", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Team Size</label>
              <Input type="number" value={form.teamSize} onChange={(e) => handleChange("teamSize", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Status</label>
              <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="acquired">Acquired</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Content Status</label>
              <Select value={form.contentStatus} onValueChange={(v) => handleChange("contentStatus", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
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

          <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Short Description (archive card)</h3>
          {shortDescSupported ? (
            <>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Short Description</label>
                <Textarea value={form.shortDescription} onChange={(e) => handleChange("shortDescription", e.target.value)} rows={2} placeholder="One line for the ventures archive card" />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Short Description (Bangla) — বাংলা</label>
                <Textarea value={form.shortDescriptionBn} onChange={(e) => handleChange("shortDescriptionBn", e.target.value)} rows={2} placeholder="বাংলা সংক্ষিপ্ত বিবরণ (optional — empty shows the English one)" />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Sort Order</label>
                <Input type="number" value={form.sortOrder} onChange={(e) => handleChange("sortOrder", e.target.value)} placeholder="1" />
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              The short-description fields need migration 0029 — they will appear here once it has landed.
            </p>
          )}

          <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Media</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Thumbnail Type</label>
              <Select value={form.thumbnailType} onValueChange={(v) => handleChange("thumbnailType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, paddingBottom: 8 }}>
              <Checkbox id="thumb-autoplay" checked={form.thumbnailAutoplay} onCheckedChange={(v) => handleChange("thumbnailAutoplay", v === true)} />
              <label htmlFor="thumb-autoplay" style={{ fontSize: 14, color: "var(--text-primary)" }}>Autoplay thumbnail video (muted, per browser rules)</label>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Thumbnail Image URL</label>
              <div style={{ display: "flex", gap: 8 }}>
                <Input value={form.thumbnailUrl} onChange={(e) => handleChange("thumbnailUrl", e.target.value)} placeholder="https://... (image)" style={{ flex: 1 }} />
                <Button type="button" variant="outline" onClick={() => setPickerTarget("thumbnailUrl")}>Choose from library</Button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Recommended: 1200×630. WebP/AVIF preferred (JPEG/PNG ok), quality 75–80 — don&apos;t compress
                aggressively. Upload close to the display size. No manual resizing needed — images are
                automatically optimized for the public site.
              </p>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Thumbnail Video URL</label>
              <div style={{ display: "flex", gap: 8 }}>
                <Input value={form.thumbnailVideoUrl} onChange={(e) => handleChange("thumbnailVideoUrl", e.target.value)} placeholder="https://... (video, used when type is Video)" style={{ flex: 1 }} />
                <Button type="button" variant="outline" onClick={() => setPickerTarget("thumbnailVideoUrl")}>Choose from library</Button>
              </div>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Videos (one URL per line)</label>
            <Textarea value={form.videos} onChange={(e) => handleChange("videos", e.target.value)} rows={3} placeholder={"https://.../demo-1.mp4\nhttps://.../demo-2.mp4"} />
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerTarget("videos")} style={{ marginTop: 8 }}>Add from library</Button>
          </div>
          <div>
            <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Gallery Images (one URL per line)</label>
            <Textarea value={form.galleryImages} onChange={(e) => handleChange("galleryImages", e.target.value)} rows={3} placeholder={"https://.../shot-1.jpg\nhttps://.../shot-2.jpg"} />
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Recommended: up to 1600px wide. WebP/AVIF preferred (JPEG/PNG ok), quality 75–80 — don&apos;t
              compress aggressively. Upload close to the display size. No manual resizing needed — images are
              automatically optimized for the public site.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerTarget("galleryImages")} style={{ marginTop: 8 }}>Add from library</Button>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Social Links (JSON)</h3>
          <Textarea value={form.socialLinks} onChange={(e) => handleChange("socialLinks", e.target.value)} rows={3} />

          <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Metrics (JSON)</h3>
          <Textarea value={form.metrics} onChange={(e) => handleChange("metrics", e.target.value)} rows={3} />

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
              <Input value={form.canonicalUrl} onChange={(e) => handleChange("canonicalUrl", e.target.value)} placeholder="https://riaz.com.bd/ventures/..." />
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
          onSelect={handlePickerSelect}
          type={pickerTarget === "thumbnailVideoUrl" || pickerTarget === "videos" ? "video" : "image"}
          title={
            pickerTarget === "logo" ? "Choose logo"
              : pickerTarget === "coverImage" ? "Choose cover image"
              : pickerTarget === "ogImage" ? "Choose OG image"
              : pickerTarget === "thumbnailVideoUrl" ? "Choose thumbnail video"
              : pickerTarget === "videos" ? "Add video"
              : pickerTarget === "galleryImages" ? "Add gallery image"
              : "Choose thumbnail image"
          }
        />
      </CardContent>
    </Card>
  );
}
