"use client";

import { useState } from "react";
import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { createContent } from "@/actions/content";
import { useRouter } from "next/navigation";
import { ContentMediaFields, parseUrlList } from "@/components/content-media-fields";

const labelStyle = { display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 } as const;

export default function NewCaseStudy() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
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
      const result = await createContent("case_studies", {
        title: form.get("title"),
        titleBn: form.get("titleBn"),
        slug: form.get("slug"),
        challenge: form.get("challenge"),
        challengeBn: form.get("challengeBn"),
        research: form.get("research"),
        researchBn: form.get("researchBn"),
        strategy: form.get("strategy"),
        strategyBn: form.get("strategyBn"),
        results: form.get("results"),
        resultsBn: form.get("resultsBn"),
        metrics,
        ...(projectId ? { projectId } : {}),
        isFeatured: form.get("isFeatured") === "on",
        thumbnailType: form.get("thumbnailType"),
        thumbnailUrl: form.get("thumbnailUrl"),
        thumbnailVideoUrl: form.get("thumbnailVideoUrl"),
        thumbnailAutoplay: form.get("thumbnailAutoplay") === "true",
        videos: parseUrlList(form.get("videos")),
        galleryImages: parseUrlList(form.get("galleryImages")),
        status: form.get("status") || "draft",
      });
      router.push(`/dashboard/content/case-studies/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create case study");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>New Case Study</h1>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Title</label>
          <Input name="title" placeholder="Case study title" required />
        </div>
        <div>
          <label style={labelStyle}>Title (Bangla) — বাংলা</label>
          <Input name="titleBn" placeholder="বাংলা শিরোনাম (optional — empty shows the English title)" />
        </div>
        <div>
          <label style={labelStyle}>Slug</label>
          <Input name="slug" placeholder="case-study-slug" />
        </div>
        <div>
          <label style={labelStyle}>Project ID (optional — UUID of the linked project)</label>
          <Input name="projectId" placeholder="e.g. 20000000-0000-4000-8000-000000000001" />
        </div>
        <div>
          <label style={labelStyle}>Challenge</label>
          <Textarea name="challenge" rows={5} placeholder="What was broken before the fix?" />
        </div>
        <div>
          <label style={labelStyle}>Challenge (Bangla) — বাংলা</label>
          <Textarea name="challengeBn" rows={5} placeholder="বাংলা চ্যালেঞ্জ (optional — empty shows the English challenge)" />
        </div>
        <div>
          <label style={labelStyle}>Research</label>
          <Textarea name="research" rows={5} placeholder="What the research found before the fix — how the problem was mapped, what stood out." />
        </div>
        <div>
          <label style={labelStyle}>Research (Bangla) — বাংলা</label>
          <Textarea name="researchBn" rows={5} placeholder="বাংলা গবেষণা (optional — empty shows the English research)" />
        </div>
        <div>
          <label style={labelStyle}>Strategy</label>
          <Textarea name="strategy" rows={5} placeholder="How the problem was fixed." />
        </div>
        <div>
          <label style={labelStyle}>Strategy (Bangla) — বাংলা</label>
          <Textarea name="strategyBn" rows={5} placeholder="বাংলা কৌশল (optional — empty shows the English strategy)" />
        </div>
        <div>
          <label style={labelStyle}>Results</label>
          <Textarea name="results" rows={5} placeholder="What changed after the fix." />
        </div>
        <div>
          <label style={labelStyle}>Results (Bangla) — বাংলা</label>
          <Textarea name="resultsBn" rows={5} placeholder="বাংলা ফলাফল (optional — empty shows the English results)" />
        </div>
        <div>
          <label style={labelStyle}>Metrics (JSON)</label>
          <Textarea name="metrics" placeholder={'{\n  "ordersPerDay": "2,000–5,000",\n  "stores": "Multi-store"\n}'} rows={4} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" id="isFeatured" name="isFeatured" />
          <label htmlFor="isFeatured" style={{ fontSize: 14, color: "var(--text-primary)" }}>Featured case study</label>
        </div>
        <ContentMediaFields />
        <div>
          <label style={labelStyle}>Status</label>
          <Select name="status" defaultValue="draft">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Case Study"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
