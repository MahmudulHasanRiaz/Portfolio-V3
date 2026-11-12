"use client";

import { useState, useEffect } from "react";
import { Button, Input, Textarea, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui";
import { listTimelineEvents, createTimelineEvent, updateTimelineEvent, deleteTimelineEvent } from "@/actions/content";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Event { id: string; sourceType: string | null; sourceId: string | null; eventType: string | null; title: string | null; description: string | null; eventDate: string | null; icon: string | null; url: string | null; sortOrder: number | null; }

export default function TimelinePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Event | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Event | null>(null);

  async function load() {
    setLoading(true);
    const result = await listTimelineEvents();
    setEvents(result.items as unknown as Event[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: FormData) {
    const data: any = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      eventDate: form.get("eventDate") as string,
      eventType: form.get("eventType") as string,
      icon: form.get("icon") as string,
      url: form.get("url") as string,
      sortOrder: form.get("sortOrder") ? parseInt(form.get("sortOrder") as string) : undefined,
    };
    try {
      if (editing) await updateTimelineEvent(editing.id, data);
      else await createTimelineEvent(data);
      setShowDialog(false);
      setEditing(null);
      setError("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save timeline event.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTimelineEvent(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete timeline event.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Timeline Events</h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus size={16} style={{ marginRight: 6 }} />Add Event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Event" : "New Timeline Event"}</DialogTitle></DialogHeader>
            <form action={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Input name="title" defaultValue={editing?.title || ""} placeholder="Event title" required />
              <Input name="eventDate" defaultValue={editing?.eventDate || ""} placeholder="Event date (YYYY-MM-DD)" />
              <Input name="eventType" defaultValue={editing?.eventType || ""} placeholder="Event type" />
              <Input name="icon" defaultValue={editing?.icon || ""} placeholder="Icon name" />
              <Input name="url" defaultValue={editing?.url || ""} placeholder="URL" />
              <Textarea name="description" defaultValue={editing?.description || ""} placeholder="Description" rows={3} />
              <Input name="sortOrder" defaultValue={editing?.sortOrder?.toString() || ""} placeholder="Sort order" type="number" />
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div style={{ color: "var(--destructive)", fontSize: 14, marginBottom: 12 }}>{error}</div>}
      {loading ? <div style={{ color: "var(--text-muted)" }}>Loading...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.length === 0 && <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>No timeline events</div>}
          {events.map((evt) => (
            <Card key={evt.id}>
              <CardContent style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{evt.title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{evt.eventDate} {evt.eventType ? `— ${evt.eventType}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(evt); setShowDialog(true); }}><Edit size={14} /></Button>
                  <Button variant="outline" size="sm" onClick={() => setPendingDelete(evt)}><Trash2 size={14} /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Delete timeline event?"
        message={pendingDelete ? `Delete "${pendingDelete.title}"?` : ""}
        onConfirm={() => { if (pendingDelete) void handleDelete(pendingDelete.id); }}
      />
    </div>
  );
}
