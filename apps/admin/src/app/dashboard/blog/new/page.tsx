"use client";

import { useState } from "react";
import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { createContent } from "@/actions/content";
import { useRouter } from "next/navigation";
import { ContentMediaFields, parseUrlList } from "@/components/content-media-fields";

const labelStyle = { display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 } as const;

/** Small grey hint under the markdown editor: inline-image guidance. */
const hintStyle = { fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" } as const;

export default function NewBlogPost() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      title: form.get("title"),
      slug: form.get("slug"),
      excerpt: form.get("excerpt"),
      content: form.get("content"),
      isFeatured: form.get("isFeatured") === "on",
      status: form.get("status"),
      // Media system (0010) — thumbnail type/autoplay come from the hidden
      // inputs ContentMediaFields mirrors (same as the edit page).
      thumbnailType: form.get("thumbnailType"),
      thumbnailUrl: String(form.get("thumbnailUrl") || ""),
      thumbnailVideoUrl: String(form.get("thumbnailVideoUrl") || ""),
      thumbnailAutoplay: form.get("thumbnailAutoplay") === "true",
      videos: parseUrlList(form.get("videos")),
      galleryImages: parseUrlList(form.get("galleryImages")),
    };

    try {
      const result = await createContent("posts", data);
      router.push(`/dashboard/blog/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>New Blog Post</h1>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff", fontSize: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Title</label>
          <Input name="title" placeholder="Post title" required />
        </div>

        <div>
          <label style={labelStyle}>Slug</label>
          <Input name="slug" placeholder="post-slug" />
        </div>

        <div>
          <label style={labelStyle}>Excerpt</label>
          <Textarea name="excerpt" placeholder="Brief description" rows={3} />
        </div>

        <div>
          <label style={labelStyle}>Content</label>
          <Textarea name="content" placeholder="Post content (markdown)" rows={12} />
          <p style={hintStyle}>
            Inline images in markdown: ![alt text](https://...) — recommended up to 1600px wide, WebP/AVIF
            preferred (JPEG/PNG ok), quality 75–80 — don&apos;t compress aggressively. No manual resizing
            needed — images are automatically optimized for the public site.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" id="isFeatured" name="isFeatured" />
          <label htmlFor="isFeatured" style={{ fontSize: 14, color: "var(--text-primary)" }}>Featured post</label>
        </div>

        <ContentMediaFields />

        <div>
          <label style={labelStyle}>Status</label>
          <Select name="status" defaultValue="draft">
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Post"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
