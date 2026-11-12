"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Video {
  id: string;
  platformName: string;
  videoUrl: string;
  title: string | null;
  sortOrder: number | null;
  createdAt: string | null;
}

interface Props {
  releaseId: string;
}

const PLATFORMS = ["YouTube", "Facebook Video", "TikTok", "Other"];

export function ReleaseVideos({ releaseId }: Props) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ platformName: "YouTube", videoUrl: "", title: "", sortOrder: "0" });

  const fetchVideos = () => {
    setLoading(true);
    setError("");
    fetch(`/api/releases/${releaseId}/videos`)
      .then(async (r) => {
        // Same guard as release-platforms: the route returns `{ error }`
        // (an object) on a 500 — storing it as `videos` would crash the
        // tab with "r.map is not a function". Require a 200 + an array.
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error((data as { error?: string } | null)?.error || "Failed to load videos");
        if (!Array.isArray(data)) throw new Error("Failed to load videos");
        setVideos(data);
      })
      .catch((err) => {
        setVideos([]);
        setError(err instanceof Error ? err.message : "Failed to load videos");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchVideos(); }, [releaseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const body = { ...form, sortOrder: parseInt(form.sortOrder, 10) };

      const res = await fetch(`/api/releases/${releaseId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add video");
      }

      setForm({ platformName: "YouTube", videoUrl: "", title: "", sortOrder: "0" });
      setShowForm(false);
      fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/releases/${releaseId}/videos?videoId=${id}`, { method: "DELETE" });
    if (res.ok) fetchVideos();
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Videos ({videos.length})</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} style={{ marginRight: 4 }} />{showForm ? "Cancel" : "Add Video"}
        </Button>
      </div>

      {error && !showForm && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff", fontSize: 14 }}>{error}</div>
      )}

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <CardContent style={{ padding: 16 }}>
            {error && <div style={{ color: "var(--destructive)", fontSize: 14, marginBottom: 8 }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Select value={form.platformName} onValueChange={(v) => setForm({ ...form, platformName: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="URL" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} required />
                <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Input type="number" placeholder="Sort Order" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Adding..." : "Add"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {videos.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No videos yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {videos.map((video) => (
            <Card key={video.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {video.title || video.platformName}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                    {video.platformName} — {video.videoUrl}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(video.id)}><Trash2 size={14} /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete video"
        message="Delete this video?"
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </div>
  );
}
