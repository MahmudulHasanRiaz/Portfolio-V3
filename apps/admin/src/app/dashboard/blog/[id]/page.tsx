"use client";

import { useState, useEffect } from "react";
import { Button, Input, Textarea, Badge } from "@repo/ui";
import { getContentById, updateContent, transitionContent, deleteContent } from "@/actions/content";
import { useRouter, useParams } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ContentMediaFields, parseUrlList } from "@/components/content-media-fields";
import { ContentSeoFields } from "@/components/content-seo-fields";

export default function EditBlogPost() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [post, setPost] = useState<Record<string, unknown> | null>(null);
  const [fetching, setFetching] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getContentById("posts", params.id).then((data) => {
      if (!data) { setError("Post not found"); setFetching(false); return; }
      setPost(data);
      setFetching(false);
    }).catch(() => {
      setError("Post not found");
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
      excerpt: form.get("excerpt"),
      excerptBn: form.get("excerptBn"),
      content: form.get("content"),
      contentBn: form.get("contentBn"),
      isFeatured: form.get("isFeatured") === "on",
      thumbnailType: form.get("thumbnailType"),
      thumbnailUrl: form.get("thumbnailUrl"),
      thumbnailVideoUrl: form.get("thumbnailVideoUrl"),
      thumbnailAutoplay: form.get("thumbnailAutoplay") === "true",
      videos: parseUrlList(form.get("videos")),
      galleryImages: parseUrlList(form.get("galleryImages")),
      metaTitle: form.get("metaTitle"),
      metaDescription: form.get("metaDescription"),
      ogImage: form.get("ogImage"),
      canonicalUrl: form.get("canonicalUrl"),
      keywords: form.get("keywords"),
    };

    try {
      await updateContent("posts", params.id, data);
      router.push("/dashboard/blog");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post");
    } finally {
      setLoading(false);
    }
  }

  async function handleTransition(action: string) {
    try {
      const result = await transitionContent("posts", params.id, action);
      setPost(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteContent("posts", params.id);
      router.push("/dashboard/blog");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
      setDeleting(false);
    }
  }

  if (fetching) return <div style={{ color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Edit Post</h1>
        {post && <Badge>{(post.status as string) || "draft"}</Badge>}
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff", fontSize: 14 }}>
          {error}
        </div>
      )}

      {post && (
        <>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Title</label>
              <Input name="title" defaultValue={post.title as string || ""} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Title (Bangla) — বাংলা</label>
              <Input name="titleBn" defaultValue={post.titleBn as string || ""} placeholder="বাংলা শিরোনাম (optional — empty shows the English title)" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Slug</label>
              <Input name="slug" defaultValue={post.slug as string || ""} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Excerpt</label>
              <Textarea name="excerpt" defaultValue={post.excerpt as string || ""} rows={3} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Excerpt (Bangla) — বাংলা</label>
              <Textarea name="excerptBn" defaultValue={post.excerptBn as string || ""} rows={3} placeholder="বাংলা সংক্ষিপ্ত বিবরণ (optional — empty shows the English excerpt)" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Content</label>
              <Textarea name="content" defaultValue={post.content as string || ""} rows={12} />
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Inline images in markdown: ![alt text](https://...) — recommended up to 1600px wide, WebP/AVIF
                preferred (JPEG/PNG ok), quality 75–80 — don&apos;t compress aggressively. No manual resizing
                needed — images are automatically optimized for the public site.
              </p>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Content (Bangla) — বাংলা</label>
              <Textarea name="contentBn" defaultValue={post.contentBn as string || ""} rows={12} placeholder="বাংলা কনটেন্ট (optional — empty shows the English content)" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="isFeatured" name="isFeatured" defaultChecked={post.isFeatured === true} />
              <label htmlFor="isFeatured" style={{ fontSize: 14, color: "var(--text-primary)" }}>Featured post</label>
            </div>

            <ContentMediaFields initial={post} />

            <ContentSeoFields initial={post} />

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
            </div>
          </form>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Danger Zone</h2>
            <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={deleting}>Delete Post</Button>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Delete archives the post — it can be restored from the Archived filter.</div>
          </div>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}
            title="Delete post"
            message={`Delete "${(post.title as string) || "this post"}"? It will be archived and can be restored later.`}
            onConfirm={handleDelete}
            busy={deleting}
            busyLabel="Deleting…"
          />

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Workflow Actions</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {post.status === "draft" && <Button onClick={() => handleTransition("submit")}>Submit for Review</Button>}
              {post.status === "review" && <Button onClick={() => handleTransition("approve")}>Approve & Publish</Button>}
              {post.status === "scheduled" && <Button onClick={() => handleTransition("publish")}>Publish Now</Button>}
              {post.status === "published" && <Button variant="outline" onClick={() => handleTransition("archive")}>Archive</Button>}
              {post.status === "archived" && <Button onClick={() => handleTransition("restore")}>Restore to Draft</Button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
