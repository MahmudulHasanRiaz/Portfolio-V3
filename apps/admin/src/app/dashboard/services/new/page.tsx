"use client";

import { useState } from "react";
import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { createContent } from "@/actions/content";
import { useRouter } from "next/navigation";
import { ContentMediaFields } from "@/components/content-media-fields";

export default function NewServicePage() {
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
      summary: form.get("summary"),
      description: form.get("description"),
      icon: form.get("icon"),
      priceRange: form.get("priceRange"),
      isFeatured: form.get("isFeatured") === "on",
      thumbnailType: form.get("thumbnailType"),
      thumbnailUrl: form.get("thumbnailUrl"),
      thumbnailVideoUrl: form.get("thumbnailVideoUrl"),
      thumbnailAutoplay: form.get("thumbnailAutoplay") === "true",
      status: form.get("status") || "draft",
    };

    try {
      const result = await createContent("services", data);
      router.push(`/dashboard/services/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>New Service</h1>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Title</label>
          <Input name="title" placeholder="Service name" required />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Slug</label>
          <Input name="slug" placeholder="service-slug" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Icon</label>
          <Input name="icon" placeholder="lucide-icon-name" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Price Range</label>
          <Input name="priceRange" placeholder="e.g. ৳10,000–৳50,000" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Summary</label>
          <Textarea name="summary" placeholder="Brief service summary" rows={3} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Description</label>
          <Textarea name="description" placeholder="Full service description" rows={8} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" id="isFeatured" name="isFeatured" />
          <label htmlFor="isFeatured" style={{ fontSize: 14, color: "var(--text-primary)" }}>Featured service</label>
        </div>
        <ContentMediaFields videosAndGallery={false} />
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Status</label>
          <Select name="status" defaultValue="draft">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Service"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
