"use client";

import { useState, useEffect } from "react";
import { Button, Input, Textarea } from "@repo/ui";
import { getContentById, updateContent, transitionContent, deleteContent } from "@/actions/content";
import { useRouter, useParams } from "next/navigation";
import { Badge } from "@repo/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ContentMediaFields, parseUrlList } from "@/components/content-media-fields";
import { ContentSeoFields } from "@/components/content-seo-fields";
import { ContentTagsField } from "@/components/content-tags-field";
import { ContentTechnologiesField, type TechnologyOption } from "@/components/content-technologies-field";
import { getEntityTags, setEntityTags } from "@/actions/entity-tags";
import { getEntityTechnologies, setEntityTechnologies, listTechnologies } from "@/actions/entity-technologies";

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [fetching, setFetching] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [technologies, setTechnologies] = useState<TechnologyOption[]>([]);
  const [projectTechnologies, setProjectTechnologies] = useState<string[]>([]);

  useEffect(() => {
    getContentById("projects", params.id).then((d) => {
      if (!d) { setError("Not found"); setFetching(false); return; }
      setProject(d); setFetching(false);
    })
      .catch(() => { setError("Not found"); setFetching(false); });
    getEntityTags("projects", params.id).then(setTags).catch(() => undefined);
    listTechnologies().then(setTechnologies).catch(() => undefined);
    getEntityTechnologies("projects", params.id).then((rows) => setProjectTechnologies(rows.map((r) => r.id))).catch(() => undefined);
  }, [params.id]);

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
      title: form.get("title"), titleBn: form.get("titleBn"), slug: form.get("slug"),
      summary: form.get("summary"), summaryBn: form.get("summaryBn"),
      description: form.get("description"), descriptionBn: form.get("descriptionBn"),
      clientName: form.get("clientName"), industry: form.get("industry"),
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
      metaTitle: form.get("metaTitle"),
      metaDescription: form.get("metaDescription"),
      ogImage: form.get("ogImage"),
      canonicalUrl: form.get("canonicalUrl"),
      keywords: form.get("keywords"),
    };
    try {
      await updateContent("projects", params.id, data);
    }
    catch (err) { setError(err instanceof Error ? err.message : "Failed"); setLoading(false); return; }
    // Tags + technologies save after the main save (parallel actions —
    // updateContent does not accept a technologies array). Either
    // failing must not navigate away: the user retries from this form.
    const failures: string[] = [];
    try {
      await setEntityTags("projects", params.id, String(form.get("tags") || ""));
    } catch (tagErr) {
      failures.push(`tags could not be saved: ${tagErr instanceof Error ? tagErr.message : "unknown error"}`);
    }
    try {
      await setEntityTechnologies("projects", params.id, form.getAll("technologies").map(String));
    } catch (techErr) {
      failures.push(`technologies could not be saved: ${techErr instanceof Error ? techErr.message : "unknown error"}`);
    }
    setLoading(false);
    if (failures.length > 0) {
      setError(`Project saved, but ${failures.join("; ")}`);
      return;
    }
    router.push("/dashboard/projects");
  }

  async function handleTransition(action: string) {
    try { const r = await transitionContent("projects", params.id, action); setProject(r); }
    catch (err) { setError(err instanceof Error ? err.message : `Failed: ${action}`); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteContent("projects", params.id);
      router.push("/dashboard/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting(false);
    }
  }

  if (fetching) return <div style={{ color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Edit Project</h1>
        {project && <Badge>{(project.status as string) || "draft"}</Badge>}
      </div>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}
      {project && (
        <>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Title</label>
              <Input name="title" defaultValue={project.title as string || ""} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Title (Bangla) — বাংলা</label>
              <Input name="titleBn" defaultValue={project.titleBn as string || ""} placeholder="বাংলা শিরোনাম (optional — empty shows the English title)" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Slug</label>
              <Input name="slug" defaultValue={project.slug as string || ""} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Client</label>
                <Input name="clientName" defaultValue={project.clientName as string || ""} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Industry</label>
                <Input name="industry" defaultValue={project.industry as string || ""} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>URL</label>
              <Input name="projectUrl" defaultValue={project.projectUrl as string || ""} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Start date</label>
                <Input name="startDate" type="date" defaultValue={typeof project.startDate === "string" ? project.startDate.slice(0, 10) : ""} />
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
                  The public site derives the project year from this date.
                </p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>End date</label>
                <Input name="endDate" type="date" defaultValue={typeof project.endDate === "string" ? project.endDate.slice(0, 10) : ""} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Summary</label>
              <Textarea name="summary" defaultValue={project.summary as string || ""} rows={3} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Summary (Bangla) — বাংলা</label>
              <Textarea name="summaryBn" defaultValue={project.summaryBn as string || ""} rows={3} placeholder="বাংলা সংক্ষিপ্ত বিবরণ (optional — empty shows the English summary)" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Description</label>
              <Textarea name="description" defaultValue={project.description as string || ""} rows={8} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Description (Bangla) — বাংলা</label>
              <Textarea name="descriptionBn" defaultValue={project.descriptionBn as string || ""} rows={8} placeholder="বাংলা বিবরণ (optional — empty shows the English description)" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="isFeatured" name="isFeatured" defaultChecked={project.isFeatured === true} />
              <label htmlFor="isFeatured" style={{ fontSize: 14, color: "var(--text-primary)" }}>Featured project</label>
            </div>
            <ContentMediaFields initial={project} />
            <ContentSeoFields initial={project} />
            <ContentTagsField initialTags={tags} />
            <ContentTechnologiesField technologies={technologies} initialTechnologyIds={projectTechnologies} />
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Danger Zone</h2>
            <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={deleting}>Delete Project</Button>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Delete archives the project — it can be restored from the Archived filter.</div>
          </div>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}
            title="Delete project"
            message={`Delete "${(project.title as string) || "this project"}"? It will be archived and can be restored later.`}
            onConfirm={handleDelete}
            busy={deleting}
            busyLabel="Deleting…"
          />
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Workflow</h2>
            <div style={{ display: "flex", gap: 8 }}>
              {project.status === "draft" && <Button onClick={() => handleTransition("publish")}>Publish</Button>}
              {project.status === "published" && <Button variant="outline" onClick={() => handleTransition("archive")}>Archive</Button>}
              {project.status === "archived" && <Button onClick={() => handleTransition("restore")}>Restore</Button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
