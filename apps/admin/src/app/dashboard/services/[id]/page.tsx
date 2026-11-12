"use client";

import { useState, useEffect } from "react";
import { Button, Input, Textarea } from "@repo/ui";
import { getContentById, updateContent, transitionContent, deleteContent } from "@/actions/content";
import { useRouter, useParams } from "next/navigation";
import { Badge } from "@repo/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ContentMediaFields } from "@/components/content-media-fields";
import { ContentSeoFields } from "@/components/content-seo-fields";

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [service, setService] = useState<Record<string, unknown> | null>(null);
  const [fetching, setFetching] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getContentById("services", params.id).then((data) => {
      if (!data) { setError("Service not found"); setFetching(false); return; }
      setService(data);
      setFetching(false);
    }).catch(() => {
      setError("Service not found");
      setFetching(false);
    });
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      title: form.get("title"),
      titleBn: form.get("titleBn"),
      slug: form.get("slug"),
      summary: form.get("summary"),
      summaryBn: form.get("summaryBn"),
      description: form.get("description"),
      descriptionBn: form.get("descriptionBn"),
      icon: form.get("icon"),
      priceRange: form.get("priceRange"),
      isFeatured: form.get("isFeatured") === "on",
      thumbnailType: form.get("thumbnailType"),
      thumbnailUrl: form.get("thumbnailUrl"),
      thumbnailVideoUrl: form.get("thumbnailVideoUrl"),
      thumbnailAutoplay: form.get("thumbnailAutoplay") === "true",
      metaTitle: form.get("metaTitle"),
      metaDescription: form.get("metaDescription"),
      ogImage: form.get("ogImage"),
      canonicalUrl: form.get("canonicalUrl"),
      keywords: form.get("keywords"),
    };
    try {
      await updateContent("services", params.id, data);
      router.push("/dashboard/services");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  async function handleTransition(action: string) {
    try {
      const result = await transitionContent("services", params.id, action);
      setService(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteContent("services", params.id);
      router.push("/dashboard/services");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete service");
      setDeleting(false);
    }
  }

  if (fetching) return <div style={{ color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Edit Service</h1>
        {service && <Badge>{(service.status as string) || "draft"}</Badge>}
      </div>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}
      {service && (
        <>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Title</label>
              <Input name="title" defaultValue={service.title as string || ""} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Title (Bangla) — বাংলা</label>
              <Input name="titleBn" defaultValue={service.titleBn as string || ""} placeholder="বাংলা শিরোনাম (optional — empty shows the English title)" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Slug</label>
              <Input name="slug" defaultValue={service.slug as string || ""} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Icon</label>
              <Input name="icon" defaultValue={service.icon as string || ""} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Price Range</label>
              <Input name="priceRange" defaultValue={service.priceRange as string || ""} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Summary</label>
              <Textarea name="summary" defaultValue={service.summary as string || ""} rows={3} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Summary (Bangla) — বাংলা</label>
              <Textarea name="summaryBn" defaultValue={service.summaryBn as string || ""} rows={3} placeholder="বাংলা সংক্ষিপ্ত বিবরণ (optional — empty shows the English summary)" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Description</label>
              <Textarea name="description" defaultValue={service.description as string || ""} rows={8} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Description (Bangla) — বাংলা</label>
              <Textarea name="descriptionBn" defaultValue={service.descriptionBn as string || ""} rows={8} placeholder="বাংলা বিবরণ (optional — empty shows the English description)" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="isFeatured" name="isFeatured" defaultChecked={service.isFeatured === true} />
              <label htmlFor="isFeatured" style={{ fontSize: 14, color: "var(--text-primary)" }}>Featured service</label>
            </div>
            <ContentMediaFields initial={service} videosAndGallery={false} />
            <ContentSeoFields initial={service} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Danger Zone</h2>
            <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={deleting}>Delete Service</Button>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Delete archives the service — it can be restored from the Archived filter.</div>
          </div>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}
            title="Delete service"
            message={`Delete "${(service.title as string) || "this service"}"? It will be archived and can be restored later.`}
            onConfirm={handleDelete}
            busy={deleting}
            busyLabel="Deleting…"
          />
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Workflow</h2>
            <div style={{ display: "flex", gap: 8 }}>
              {service.status === "draft" && <Button onClick={() => handleTransition("publish")}>Publish</Button>}
              {service.status === "published" && <Button variant="outline" onClick={() => handleTransition("archive")}>Archive</Button>}
              {service.status === "archived" && <Button onClick={() => handleTransition("restore")}>Restore</Button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
