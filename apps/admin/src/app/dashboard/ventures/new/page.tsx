"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent } from "@repo/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewVenturePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    website: "",
    industry: "",
    stage: "",
    location: "",
    teamSize: "",
    status: "active",
    contentStatus: "draft",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !prev.slug) {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        website: form.website,
        industry: form.industry,
        stage: form.stage,
        location: form.location,
        status: form.status,
        contentStatus: form.contentStatus,
      };
      if (form.teamSize) body.teamSize = parseInt(form.teamSize, 10);

      const res = await fetch("/api/ventures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create venture");
      }

      const venture = await res.json();
      router.push(`/dashboard/ventures/${venture.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href="/dashboard/ventures">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>New Venture</h1>
      </div>

      <Card>
        <CardContent style={{ padding: 24 }}>
          {error && (
            <div style={{ color: "var(--destructive)", marginBottom: 16, fontSize: 14 }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Name</label>
                <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Slug</label>
                <Input value={form.slug} onChange={(e) => handleChange("slug", e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Website</label>
                <Input value={form.website} onChange={(e) => handleChange("website", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Industry</label>
                <Input value={form.industry} onChange={(e) => handleChange("industry", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Stage</label>
                <Input value={form.stage} onChange={(e) => handleChange("stage", e.target.value)} placeholder="e.g. Seed, Series A" />
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
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Link href="/dashboard/ventures">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Venture"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
