"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent } from "@repo/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const TYPES = ["nasheed", "tilawat", "acting", "podcast", "interview", "documentary"];
const FORMATS = ["single", "ep", "album"];

export default function NewReleasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    slug: "",
    type: "nasheed",
    format: "",
    description: "",
    releaseDate: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && !prev.slug) {
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
      const res = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create release");
      }

      const release = await res.json();
      router.push(`/dashboard/releases/${release.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href="/dashboard/releases">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>New Release</h1>
      </div>

      <Card>
        <CardContent style={{ padding: 24 }}>
          {error && (
            <div style={{ color: "var(--destructive)", marginBottom: 16, fontSize: 14 }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Title</label>
                <Input value={form.title} onChange={(e) => handleChange("title", e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Slug</label>
                <Input value={form.slug} onChange={(e) => handleChange("slug", e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Type</label>
                <Select value={form.type} onValueChange={(v) => handleChange("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Format</label>
                <Select value={form.format || "none"} onValueChange={(v) => handleChange("format", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Release Date</label>
                <Input type="date" value={form.releaseDate} onChange={(e) => handleChange("releaseDate", e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: "block" }}>Description</label>
              <Textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={4} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Link href="/dashboard/releases">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Release"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
