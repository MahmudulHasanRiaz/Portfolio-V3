"use client";

import { useState, useEffect } from "react";
import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { createContent } from "@/actions/content";
import { useRouter } from "next/navigation";
import { ContentMediaFields, parseUrlList } from "@/components/content-media-fields";
import { ContentTechnologiesField, type TechnologyOption } from "@/components/content-technologies-field";
import { setEntityTechnologies, listTechnologies } from "@/actions/entity-technologies";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [technologies, setTechnologies] = useState<TechnologyOption[]>([]);

  useEffect(() => {
    listTechnologies().then(setTechnologies).catch(() => undefined);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    // Empty date inputs send "" — the project schema takes null for a
    // cleared date ("" would be a Postgres date error).
    const dateOrNull = (v: FormDataEntryValue | null) =>
      typeof v === "string" && v.trim() !== "" ? v : null;
    const data: Record<string, unknown> = {
      title: form.get("title"),
      slug: form.get("slug"),
      summary: form.get("summary"),
      description: form.get("description"),
      clientName: form.get("clientName"),
      industry: form.get("industry"),
      projectUrl: form.get("projectUrl"),
      startDate: dateOrNull(form.get("startDate")),
      endDate: dateOrNull(form.get("endDate")),
      isFeatured: form.get("isFeatured") === "on",
      thumbnailType: form.get("thumbnailType"),
      thumbnailUrl: form.get("thumbnailUrl"),
      thumbnailVideoUrl: form.get("thumbnailVideoUrl"),
      thumbnailAutoplay: form.get("thumbnailAutoplay") === "true",
      videos: parseUrlList(form.get("videos")),
      galleryImages: parseUrlList(form.get("galleryImages")),
      status: form.get("status") || "draft",
    };
    try {
      const result = await createContent("projects", data);
      // Technologies save after the create (parallel action —
      // createContent does not accept a technologies array). If it
      // fails, still go to the edit page — the project exists, and
      // re-submitting this form would create a duplicate.
      try {
        await setEntityTechnologies("projects", result.id, form.getAll("technologies").map(String));
      } catch {
        // Swallowed deliberately: the edit page offers the same picker.
      }
      router.push(`/dashboard/projects/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>New Project</h1>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Title</label>
          <Input name="title" placeholder="Project name" required />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Slug</label>
          <Input name="slug" placeholder="project-slug" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Client Name</label>
            <Input name="clientName" placeholder="Client" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Industry</label>
            <Input name="industry" placeholder="e.g. Tech" />
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Project URL</label>
          <Input name="projectUrl" placeholder="https://..." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Start date</label>
            <Input name="startDate" type="date" />
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
              The public site derives the project year from this date.
            </p>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>End date</label>
            <Input name="endDate" type="date" />
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Summary</label>
          <Textarea name="summary" placeholder="Brief project summary" rows={3} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Description</label>
          <Textarea name="description" placeholder="Full project description" rows={8} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" id="isFeatured" name="isFeatured" />
          <label htmlFor="isFeatured" style={{ fontSize: 14, color: "var(--text-primary)" }}>Featured project</label>
        </div>
        <ContentMediaFields />
        <ContentTechnologiesField technologies={technologies} />
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
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Project"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
