"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardContent, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge } from "@repo/ui";
import { Plus, Trash2, Calendar } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  eventDate: string | null;
  url: string | null;
  createdAt: string | null;
}

interface Props {
  releaseId: string;
}

const EVENT_TYPES = ["milestone", "launch", "award", "performance", "media", "other"];

export function ReleaseTimeline({ releaseId }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    eventType: "milestone", title: "", description: "", eventDate: "", url: "",
  });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchEvents = () => {
    setLoading(true);
    setError("");
    fetch(`/api/releases/${releaseId}/timeline`)
      .then(async (r) => {
        // Same guard as release-platforms: the route returns `{ error }`
        // (an object) on a 500 — storing it as `events` would crash the
        // tab with "r.map is not a function". Require a 200 + an array.
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error((data as { error?: string } | null)?.error || "Failed to load timeline");
        if (!Array.isArray(data)) throw new Error("Failed to load timeline");
        setEvents(data);
      })
      .catch((err) => {
        setEvents([]);
        setError(err instanceof Error ? err.message : "Failed to load timeline");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, [releaseId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/releases/${releaseId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add event");
      }

      setForm({ eventType: "milestone", title: "", description: "", eventDate: "", url: "" });
      setShowForm(false);
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/releases/${releaseId}/timeline`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: id }),
    });
    if (res.ok) fetchEvents();
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Timeline ({events.length})</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} style={{ marginRight: 4 }} />Add Event
        </Button>
      </div>

      {error && !showForm && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, backgroundColor: "var(--accent-danger)", color: "#fff", fontSize: 14 }}>{error}</div>
      )}

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <CardContent style={{ padding: 16 }}>
            {error && <div style={{ color: "var(--destructive)", fontSize: 14, marginBottom: 8 }}>{error}</div>}
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                <Select value={form.eventType} onValueChange={(v) => setForm({ ...form, eventType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
                <Input placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              </div>
              <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Adding..." : "Add"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {events.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No timeline events yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{event.title}</span>
                    <Badge variant="outline">{event.eventType}</Badge>
                  </div>
                  {event.description && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{event.description}</div>}
                  {event.eventDate && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={12} />{event.eventDate}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(event.id)}><Trash2 size={14} /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Delete timeline event"
        message="Delete this timeline event?"
        onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); }}
      />
    </div>
  );
}
