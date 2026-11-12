"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardContent, Input, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface PlatformLink {
  id: string;
  platformName: string;
  platformUrl: string;
  createdAt: string | null;
}

interface Props {
  releaseId: string;
}

const PLATFORMS = ["Spotify", "Apple Music", "YouTube Music", "Amazon Music", "TikTok Music", "Facebook Music", "Boomplay", "JioSaavn", "Gaana", "iHeartRadio", "Other"];

export function ReleasePlatforms({ releaseId }: Props) {
  const [platforms, setPlatforms] = useState<PlatformLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ platformName: "Spotify", platformUrl: "" });

  const fetchPlatforms = () => {
    setLoading(true);
    setError("");
    fetch(`/api/releases/${releaseId}/platforms`)
      .then(async (r) => {
        // The route returns `{ error }` (an object, not an array) on any
        // 500 — storing it as `platforms` used to crash the tab with
        // "r.map is not a function". Never trust the shape: require a
        // 200 + an array, and render an error state instead of crashing.
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error((data as { error?: string } | null)?.error || "Failed to load platforms");
        if (!Array.isArray(data)) throw new Error("Failed to load platforms");
        setPlatforms(data);
      })
      .catch((err) => {
        setPlatforms([]);
        setError(err instanceof Error ? err.message : "Failed to load platforms");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlatforms(); }, [releaseId]);

  const resetForm = () => {
    setForm({ platformName: "Spotify", platformUrl: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // PATCH/DELETE live on /platforms/[platformId] — the collection route
      // only has GET/POST, so edits used to 405.
      const method = editingId ? "PATCH" : "POST";
      const url = editingId
        ? `/api/releases/${releaseId}/platforms/${editingId}`
        : `/api/releases/${releaseId}/platforms`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save platform");
      }

      resetForm();
      fetchPlatforms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/releases/${releaseId}/platforms/${id}`, {
      method: "DELETE",
    });
    if (res.ok) fetchPlatforms();
  };

  const startEdit = (platform: PlatformLink) => {
    setForm({ platformName: platform.platformName, platformUrl: platform.platformUrl });
    setEditingId(platform.id);
    setShowForm(true);
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Platforms ({platforms.length})</h3>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus size={14} style={{ marginRight: 4 }} />{showForm ? "Cancel" : "Add Platform"}
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
                <Input placeholder="URL" value={form.platformUrl} onChange={(e) => setForm({ ...form, platformUrl: e.target.value })} required />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update" : "Add"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {platforms.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No platform links yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {platforms.map((platform) => (
            <Card key={platform.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Badge>{platform.platformName}</Badge>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{platform.platformUrl}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(platform)}><Edit2 size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(platform.id)}><Trash2 size={14} /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete platform link"
        message="Delete this platform link?"
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </div>
  );
}
