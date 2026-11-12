"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Input, Textarea, Badge, RadioGroup, RadioGroupItem, Checkbox } from "@repo/ui";
import { getContentById, updateContent, transitionContent, deleteContent } from "@/actions/content";
import { getEntityTags, setEntityTags } from "@/actions/entity-tags";
import { useRouter, useParams } from "next/navigation";
import { MediaPicker } from "@/components/media-picker";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ContentSeoFields } from "@/components/content-seo-fields";
import { ContentTagsField } from "@/components/content-tags-field";

/** One URL per line (videos / gallery images) -> string[]. */
function parseUrlList(v: FormDataEntryValue | null): string[] {
  if (typeof v !== "string") return [];
  return v.split("\n").map((s) => s.trim()).filter(Boolean);
}

/** Stored string[] (jsonb) -> one URL per line for the textarea. */
function listValue(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return v.filter((i): i is string => typeof i === "string" && i.length > 0).join("\n");
}

const labelStyle = { display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 } as const;

export default function EditCaseStudy() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [fetching, setFetching] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [thumbnailType, setThumbnailType] = useState<"image" | "video">("image");
  const [thumbnailAutoplay, setThumbnailAutoplay] = useState(false);
  // Media Picker — fills the URL fields below (same values the form saves).
  const thumbUrlRef = useRef<HTMLInputElement>(null);
  const thumbVideoUrlRef = useRef<HTMLInputElement>(null);
  const videosRef = useRef<HTMLTextAreaElement>(null);
  const galleryRef = useRef<HTMLTextAreaElement>(null);
  const [pickerTarget, setPickerTarget] = useState<"thumbnailUrl" | "thumbnailVideoUrl" | "videos" | "galleryImages" | null>(null);

  const handlePickerSelect = (url: string) => {
    const appendLine = (ref: React.RefObject<HTMLTextAreaElement | null>) => {
      if (!ref.current) return;
      ref.current.value = ref.current.value
        ? `${ref.current.value.replace(/\n*$/, "")}\n${url}`
        : url;
    };
    if (pickerTarget === "thumbnailUrl" && thumbUrlRef.current) thumbUrlRef.current.value = url;
    else if (pickerTarget === "thumbnailVideoUrl" && thumbVideoUrlRef.current) thumbVideoUrlRef.current.value = url;
    else if (pickerTarget === "videos") appendLine(videosRef);
    else if (pickerTarget === "galleryImages") appendLine(galleryRef);
  };

  useEffect(() => {
    getContentById("case_studies", params.id).then((d) => {
      if (!d) { setError("Not found"); setFetching(false); return; }
      setData(d);
      setThumbnailType((d.thumbnailType as string) === "video" ? "video" : "image");
      setThumbnailAutoplay(d.thumbnailAutoplay === true);
      setFetching(false);
    })
      .catch(() => { setError("Not found"); setFetching(false); });
    getEntityTags("case_studies", params.id).then(setTags).catch(() => undefined);
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const form = new FormData(e.currentTarget);
    try {
      const projectId = String(form.get("projectId") || "").trim();
      // Metrics is a free-form JSON object (e.g. {"ordersPerDay": "2,000–5,000"}).
      let metrics: Record<string, unknown> | undefined;
      const metricsRaw = String(form.get("metrics") || "").trim();
      if (metricsRaw) {
        try {
          metrics = JSON.parse(metricsRaw);
        } catch {
          setError("Metrics must be valid JSON");
          setLoading(false);
          return;
        }
      }
      await updateContent("case_studies", params.id, {
        title: form.get("title"), titleBn: form.get("titleBn"), slug: form.get("slug"),
        challenge: form.get("challenge"), challengeBn: form.get("challengeBn"),
        research: form.get("research"), researchBn: form.get("researchBn"),
        strategy: form.get("strategy"), strategyBn: form.get("strategyBn"),
        results: form.get("results"), resultsBn: form.get("resultsBn"),
        metrics,
        ...(projectId ? { projectId } : {}),
        isFeatured: form.get("isFeatured") === "on",
        // Media system (0010)
        thumbnailType,
        thumbnailUrl: String(form.get("thumbnailUrl") || ""),
        thumbnailVideoUrl: String(form.get("thumbnailVideoUrl") || ""),
        thumbnailAutoplay,
        videos: parseUrlList(form.get("videos")),
        galleryImages: parseUrlList(form.get("galleryImages")),
        metaTitle: form.get("metaTitle"),
        metaDescription: form.get("metaDescription"),
        ogImage: form.get("ogImage"),
        canonicalUrl: form.get("canonicalUrl"),
        keywords: form.get("keywords"),
      });
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); setLoading(false); return; }
    try {
      await setEntityTags("case_studies", params.id, String(form.get("tags") || ""));
      router.push("/dashboard/content/case-studies");
    } catch (tagErr) {
      setError(`Case study saved, but tags could not be saved: ${tagErr instanceof Error ? tagErr.message : "unknown error"}`);
    } finally { setLoading(false); }
  }

  async function handleTransition(action: string) {
    try {
      const r = await transitionContent("case_studies", params.id, action);
      setData(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteContent("case_studies", params.id);
      router.push("/dashboard/content/case-studies");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete case study");
      setDeleting(false);
    }
  }

  if (fetching) return <div style={{ color: "var(--text-muted)" }}>Loading...</div>;
  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Edit Case Study</h1>
        {data && <Badge>{(data.status as string) || "draft"}</Badge>}
      </div>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}
      {data && (
        <>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Title</label>
              <Input name="title" defaultValue={data.title as string || ""} required />
            </div>
            <div>
              <label style={labelStyle}>Title (Bangla) — বাংলা</label>
              <Input name="titleBn" defaultValue={data.titleBn as string || ""} placeholder="বাংলা শিরোনাম (optional — empty shows the English title)" />
            </div>
            <div>
              <label style={labelStyle}>Slug</label>
              <Input name="slug" defaultValue={data.slug as string || ""} />
            </div>
            <div>
              <label style={labelStyle}>Project ID (optional — UUID of the linked project)</label>
              <Input name="projectId" defaultValue={data.projectId as string || ""} placeholder="e.g. 20000000-0000-4000-8000-000000000001" />
            </div>
            <div>
              <label style={labelStyle}>Challenge</label>
              <Textarea name="challenge" defaultValue={data.challenge as string || ""} rows={5} />
            </div>
            <div>
              <label style={labelStyle}>Challenge (Bangla) — বাংলা</label>
              <Textarea name="challengeBn" defaultValue={data.challengeBn as string || ""} rows={5} placeholder="বাংলা চ্যালেঞ্জ (optional — empty shows the English challenge)" />
            </div>
            <div>
              <label style={labelStyle}>Research</label>
              <Textarea name="research" defaultValue={data.research as string || ""} rows={5} placeholder="What the research found before the fix — how the problem was mapped, what stood out." />
            </div>
            <div>
              <label style={labelStyle}>Research (Bangla) — বাংলা</label>
              <Textarea name="researchBn" defaultValue={data.researchBn as string || ""} rows={5} placeholder="বাংলা গবেষণা (optional — empty shows the English research)" />
            </div>
            <div>
              <label style={labelStyle}>Strategy</label>
              <Textarea name="strategy" defaultValue={data.strategy as string || ""} rows={5} />
            </div>
            <div>
              <label style={labelStyle}>Strategy (Bangla) — বাংলা</label>
              <Textarea name="strategyBn" defaultValue={data.strategyBn as string || ""} rows={5} placeholder="বাংলা কৌশল (optional — empty shows the English strategy)" />
            </div>
            <div>
              <label style={labelStyle}>Results</label>
              <Textarea name="results" defaultValue={data.results as string || ""} rows={5} />
            </div>
            <div>
              <label style={labelStyle}>Results (Bangla) — বাংলা</label>
              <Textarea name="resultsBn" defaultValue={data.resultsBn as string || ""} rows={5} placeholder="বাংলা ফলাফল (optional — empty shows the English results)" />
            </div>
            <div>
              <label style={labelStyle}>Metrics (JSON)</label>
              <Textarea name="metrics" defaultValue={data.metrics ? JSON.stringify(data.metrics, null, 2) : ""} placeholder={'{\n  "ordersPerDay": "2,000–5,000",\n  "stores": "Multi-store"\n}'} rows={4} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="isFeatured" name="isFeatured" defaultChecked={data.isFeatured === true} />
              <label htmlFor="isFeatured" style={{ fontSize: 14, color: "var(--text-primary)" }}>Featured case study</label>
            </div>
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
                </div>
                <div>
                  <label style={labelStyle}>Thumbnail image URL</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Input ref={thumbUrlRef} name="thumbnailUrl" defaultValue={data.thumbnailUrl as string || ""} placeholder="https://... (image)" style={{ flex: 1 }} />
                    <Button type="button" variant="outline" onClick={() => setPickerTarget("thumbnailUrl")}>Choose from library</Button>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Thumbnail video URL</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Input ref={thumbVideoUrlRef} name="thumbnailVideoUrl" defaultValue={data.thumbnailVideoUrl as string || ""} placeholder="https://... (video, used when type is Video)" style={{ flex: 1 }} />
                    <Button type="button" variant="outline" onClick={() => setPickerTarget("thumbnailVideoUrl")}>Choose from library</Button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Checkbox id="thumb-autoplay" checked={thumbnailAutoplay} onCheckedChange={(v) => setThumbnailAutoplay(v === true)} />
                  <label htmlFor="thumb-autoplay" style={{ fontSize: 14, color: "var(--text-primary)" }}>Autoplay thumbnail video (muted, per browser rules)</label>
                </div>
                <div>
                  <label style={labelStyle}>Videos (one URL per line)</label>
                  <Textarea ref={videosRef} name="videos" defaultValue={listValue(data.videos)} placeholder={"https://.../demo-1.mp4\nhttps://.../demo-2.mp4"} rows={3} />
                  <Button type="button" variant="outline" size="sm" onClick={() => setPickerTarget("videos")} style={{ marginTop: 8 }}>Add from library</Button>
                </div>
                <div>
                  <label style={labelStyle}>Gallery images (one URL per line)</label>
                  <Textarea ref={galleryRef} name="galleryImages" defaultValue={listValue(data.galleryImages)} placeholder={"https://.../shot-1.jpg\nhttps://.../shot-2.jpg"} rows={3} />
                  <Button type="button" variant="outline" size="sm" onClick={() => setPickerTarget("galleryImages")} style={{ marginTop: 8 }}>Add from library</Button>
                </div>
              </div>
            </div>
            <ContentSeoFields initial={data} />
            <ContentTagsField initialTags={tags} />
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
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Workflow</h2>
            <div style={{ display: "flex", gap: 8 }}>
              {data.status === "draft" && <Button onClick={() => handleTransition("publish")}>Publish</Button>}
              {data.status === "published" && <Button variant="outline" onClick={() => handleTransition("archive")}>Archive</Button>}
              {data.status === "archived" && <Button onClick={() => handleTransition("restore")}>Restore</Button>}
            </div>
          </div>
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Danger Zone</h2>
            <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={deleting}>Delete Case Study</Button>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Delete archives the case study — it can be restored from the Archived filter.</div>
          </div>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}
            title="Delete case study"
            message={`Delete "${(data.title as string) || "this case study"}"? It will be archived and can be restored later.`}
            onConfirm={handleDelete}
            busy={deleting}
            busyLabel="Deleting…"
          />
        </>
      )}
    </div>
  );
}
