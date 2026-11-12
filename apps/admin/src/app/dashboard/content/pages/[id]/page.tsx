"use client";

import { useState, useEffect } from "react";
import { Button, Input, Textarea, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { getContentById, updateContent } from "@/actions/content";
import { useRouter, useParams } from "next/navigation";

export default function EditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    getContentById("pages", params.id).then((d) => { setData(d); setStatus((d?.status as string) || "draft"); setFetching(false); })
      .catch(() => { setError("Not found"); setFetching(false); });
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const form = new FormData(e.currentTarget);
    try {
      await updateContent("pages", params.id, { title: form.get("title"), slug: form.get("slug"), content: form.get("content"), status });
      router.push("/dashboard/content/pages");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  if (fetching) return <div style={{ color: "var(--text-muted)" }}>Loading...</div>;
  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Edit Page</h1>
        {data && <Badge>{(data.status as string) || "draft"}</Badge>}
      </div>
      {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff" }}>{error}</div>}
      {data && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Title</label>
            <Input name="title" defaultValue={data.title as string || ""} required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Slug</label>
            <Input name="slug" defaultValue={data.slug as string || ""} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>Content</label>
            <Textarea name="content" defaultValue={data.content as string || ""} rows={16} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}
